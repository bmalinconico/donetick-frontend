import { Avatar, Box, Sheet, Typography } from '@mui/joy'

const initialsOf = name => {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const FamilyPicker = ({ members, onPick }) => {
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        p: 4,
      }}
    >
      <Typography
        level='h1'
        sx={{ fontSize: { xs: 36, sm: 56 }, textAlign: 'center' }}
      >
        Who are you?
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 2, sm: 3 },
          width: '100%',
          maxWidth: 1100,
        }}
      >
        {members.map(member => {
          const name = member.displayName || member.name || 'User'
          return (
            <Sheet
              key={member.userId}
              variant='outlined'
              onClick={() => onPick(member)}
              sx={{
                cursor: 'pointer',
                p: { xs: 2, sm: 3 },
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                userSelect: 'none',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                boxShadow: 'sm',
                '&:hover': { boxShadow: 'md' },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              <Avatar
                src={member.image || member.avatar}
                alt={name}
                sx={{
                  width: { xs: 96, sm: 128 },
                  height: { xs: 96, sm: 128 },
                  fontSize: { xs: 40, sm: 56 },
                }}
              >
                {initialsOf(name)}
              </Avatar>
              <Typography
                level='h3'
                sx={{
                  fontSize: { xs: 22, sm: 28 },
                  textAlign: 'center',
                  wordBreak: 'break-word',
                }}
              >
                {name}
              </Typography>
            </Sheet>
          )
        })}
      </Box>
    </Box>
  )
}

export default FamilyPicker
