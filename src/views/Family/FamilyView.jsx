import {
  Box,
  Button,
  CircularProgress,
  DialogContent,
  DialogTitle,
  Modal,
  ModalDialog,
  Typography,
} from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { exitKiosk, isFamilyKioskConfigured } from '../../utils/familyAuth'
import FamilyPicker from './FamilyPicker'
import FamilyTaskList from './FamilyTaskList'

const IDLE_MS = 60_000
// Hidden escape hatch: press-and-hold the top-right corner this long to open the
// exit-kiosk confirmation. Obscure enough that kids won't trigger it by accident.
const EXIT_HOLD_MS = 3000
const EXIT_CORNER_PX = 64

const FamilyView = () => {
  const navigate = useNavigate()
  const { data: userProfile, isLoading: profileLoading } = useUserProfile()
  const { data: membersData, isLoading: membersLoading } = useCircleMembers()
  const { startImpersonation, stopImpersonation } = useImpersonateUser()

  const [picked, setPicked] = useState(null)
  const idleTimerRef = useRef(null)

  // Always start clean: don't inherit a stale impersonation when entering kiosk.
  useEffect(() => {
    stopImpersonation()
    return () => stopImpersonation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goBackToPicker = useCallback(() => {
    setPicked(null)
    stopImpersonation()
  }, [stopImpersonation])

  // Idle timer is only armed once a user has been picked. Any pointer/key resets it.
  useEffect(() => {
    if (!picked) return undefined

    const reset = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(goBackToPicker, IDLE_MS)
    }
    reset()

    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [picked, goBackToPicker])

  if (profileLoading || membersLoading) {
    return (
      <KioskShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress size='lg' />
        </Box>
      </KioskShell>
    )
  }

  if (!userProfile) {
    // In kiosk mode the app auto-authenticates and /login redirects back here, so
    // navigating away would loop. Show a clear error instead (e.g. server down or
    // the family account can't be loaded). Otherwise fall back to the login flow.
    if (isFamilyKioskConfigured()) {
      return (
        <KioskShell>
          <Typography level='h3' sx={{ textAlign: 'center', mt: 10, px: 4 }}>
            Couldn&apos;t reach the family account. Check that the server is up,
            then reload.
          </Typography>
        </KioskShell>
      )
    }
    navigate('/login')
    return null
  }

  const members = membersData?.res || []
  if (!members.length) {
    return (
      <KioskShell>
        <Typography level='h2' sx={{ textAlign: 'center', mt: 10 }}>
          No family members found.
        </Typography>
      </KioskShell>
    )
  }

  return (
    <KioskShell>
      {picked ? (
        <FamilyTaskList user={picked} onBack={goBackToPicker} />
      ) : (
        <FamilyPicker
          members={members}
          onPick={member => {
            startImpersonation(member, userProfile)
            setPicked(member)
          }}
        />
      )}
    </KioskShell>
  )
}

// Fullscreen overlay so the kiosk view covers NavBar and the rest of the app shell.
// z-index sits above NavBar (1000) but below Joy's Modal default (1300) so the
// confirmation modal portals on top of the kiosk.
const KioskShell = ({ children }) => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      bgcolor: 'background.body',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
    <KioskExitControl />
  </Box>
)

// Detects a long-press in the top-right corner (via window listeners, so it never
// covers or blocks any on-screen control) and offers to leave kiosk mode. Present
// in every kiosk state, including the error screen, so a stuck device can escape.
const KioskExitControl = () => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const inCorner = e =>
      e.clientX >= window.innerWidth - EXIT_CORNER_PX &&
      e.clientY <= EXIT_CORNER_PX
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    const onDown = e => {
      if (!inCorner(e)) return
      clear()
      timerRef.current = setTimeout(() => setConfirmOpen(true), EXIT_HOLD_MS)
    }
    const onMove = e => {
      if (timerRef.current && !inCorner(e)) clear()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', clear)
    window.addEventListener('pointercancel', clear)
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', clear)
      window.removeEventListener('pointercancel', clear)
      window.removeEventListener('pointermove', onMove)
      clear()
    }
  }, [])

  return (
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
      <ModalDialog>
        <DialogTitle>Exit kiosk mode?</DialogTitle>
        <DialogContent>
          This unlocks the full app (all chores, settings) on this device. You
          can re-enable kiosk mode any time from Settings.
        </DialogContent>
        <Box
          sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}
        >
          <Button
            variant='plain'
            color='neutral'
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button color='danger' onClick={exitKiosk}>
            Exit kiosk
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default FamilyView
