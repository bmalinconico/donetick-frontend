import { ArrowBack, CheckCircle } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Modal,
  ModalDialog,
  Sheet,
  Typography,
} from '@mui/joy'
import { useMemo, useState } from 'react'
import { useChores, useMarkChoreComplete } from '../../queries/ChoreQueries'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfToday = () => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

const isAssignedTo = (chore, userId) => chore.assignedTo === userId

const isShowable = chore => {
  if (!chore.nextDueDate) return true
  const due = new Date(chore.nextDueDate)
  return due <= endOfToday()
}

const dueLabel = chore => {
  if (!chore.nextDueDate) return 'Anytime'
  const due = new Date(chore.nextDueDate)
  if (due < startOfToday()) return 'Overdue'
  return 'Due today'
}

// Sort overdue → due-today → undated. Within dated, oldest first.
const taskSort = (a, b) => {
  if (!a.nextDueDate && !b.nextDueDate) return 0
  if (!a.nextDueDate) return 1
  if (!b.nextDueDate) return -1
  return new Date(a.nextDueDate) - new Date(b.nextDueDate)
}

const FamilyTaskList = ({ user, onBack }) => {
  const { data: choresData, isLoading } = useChores(false)
  const markComplete = useMarkChoreComplete()
  const [pending, setPending] = useState(null)
  const [justCompleted, setJustCompleted] = useState(null)

  const tasks = useMemo(() => {
    const all = choresData?.res || []
    return all
      .filter(c => isAssignedTo(c, user.userId) && isShowable(c))
      .sort(taskSort)
  }, [choresData, user.userId])

  const handleConfirm = () => {
    const chore = pending
    if (!chore) return
    markComplete.mutate(
      {
        choreId: chore.id,
        body: {},
        completedDate: null,
        performer: user.userId,
      },
      {
        onSuccess: () => {
          setJustCompleted(chore.name)
          setTimeout(() => setJustCompleted(null), 1800)
        },
      },
    )
    setPending(null)
  }

  const name = user.displayName || user.name || 'User'

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2, sm: 4 },
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        <Button
          variant='soft'
          color='neutral'
          size='lg'
          onClick={onBack}
          startDecorator={<ArrowBack />}
          sx={{ fontSize: 20, py: 1.5, px: 2.5, borderRadius: 16 }}
        >
          Not me
        </Button>
        <Avatar
          src={user.image || user.avatar}
          alt={name}
          sx={{ width: 64, height: 64, ml: 'auto' }}
        />
        <Typography level='h2' sx={{ fontSize: { xs: 24, sm: 32 } }}>
          {name}
        </Typography>
      </Box>

      <Typography
        level='h1'
        sx={{ fontSize: { xs: 32, sm: 44 }, textAlign: 'center' }}
      >
        {tasks.length === 0 ? 'All done! 🎉' : 'What you need to do'}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress size='lg' />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: '100%',
            maxWidth: 900,
            mx: 'auto',
            overflowY: 'auto',
          }}
        >
          {tasks.map(chore => {
            const label = dueLabel(chore)
            const overdue = label === 'Overdue'
            return (
              <Sheet
                key={chore.id}
                variant='outlined'
                onClick={() => setPending(chore)}
                sx={{
                  cursor: 'pointer',
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  boxShadow: 'sm',
                  borderColor: overdue ? 'danger.500' : undefined,
                  borderWidth: overdue ? 2 : 1,
                  userSelect: 'none',
                  transition: 'transform 0.1s ease',
                  '&:active': { transform: 'scale(0.99)' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    level='h3'
                    sx={{
                      fontSize: { xs: 22, sm: 28 },
                      mb: 0.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {chore.name}
                  </Typography>
                  {label && (
                    <Typography
                      level='body-md'
                      sx={{
                        fontSize: { xs: 16, sm: 18 },
                        color: overdue ? 'danger.600' : 'neutral.600',
                        fontWeight: overdue ? 700 : 500,
                      }}
                    >
                      {label}
                    </Typography>
                  )}
                </Box>
                <CheckCircle
                  sx={{
                    fontSize: { xs: 48, sm: 64 },
                    color: 'success.500',
                    flexShrink: 0,
                  }}
                />
              </Sheet>
            )
          })}
        </Box>
      )}

      <Modal open={!!pending} onClose={() => setPending(null)}>
        <ModalDialog
          size='lg'
          sx={{
            maxWidth: 560,
            width: '90%',
            borderRadius: 24,
            p: { xs: 3, sm: 4 },
          }}
        >
          <Typography
            level='h2'
            sx={{ fontSize: { xs: 26, sm: 32 }, mb: 1, textAlign: 'center' }}
          >
            Did you finish?
          </Typography>
          <Typography
            level='h3'
            sx={{
              fontSize: { xs: 22, sm: 26 },
              mb: 3,
              textAlign: 'center',
              fontWeight: 400,
            }}
          >
            {pending?.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              size='lg'
              variant='soft'
              color='neutral'
              onClick={() => setPending(null)}
              sx={{ flex: 1, fontSize: 22, py: 2.5, borderRadius: 16 }}
            >
              Not yet
            </Button>
            <Button
              size='lg'
              color='success'
              onClick={handleConfirm}
              startDecorator={<CheckCircle />}
              sx={{ flex: 1, fontSize: 22, py: 2.5, borderRadius: 16 }}
            >
              Yes!
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      <Modal open={!!justCompleted} onClose={() => setJustCompleted(null)}>
        <ModalDialog
          size='lg'
          variant='soft'
          color='success'
          sx={{
            maxWidth: 480,
            width: '90%',
            borderRadius: 24,
            textAlign: 'center',
            p: 4,
          }}
        >
          <Typography level='h1' sx={{ fontSize: 64, mb: 1 }}>
            🎉
          </Typography>
          <Typography level='h2' sx={{ fontSize: 28, mb: 1 }}>
            Great job!
          </Typography>
          <Typography level='body-lg' sx={{ fontSize: 20 }}>
            {justCompleted}
          </Typography>
        </ModalDialog>
      </Modal>
    </Box>
  )
}

export default FamilyTaskList
