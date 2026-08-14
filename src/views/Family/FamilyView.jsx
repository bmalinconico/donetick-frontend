import { Box, CircularProgress, Typography } from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { isFamilyKioskConfigured } from '../../utils/familyAuth'
import FamilyPicker from './FamilyPicker'
import FamilyTaskList from './FamilyTaskList'

const IDLE_MS = 60_000

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
  </Box>
)

export default FamilyView
