import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#204060',
      light: '#4f6f8f',
      dark: '#10263d',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: '#c46b48',
      light: '#de9a7d',
      dark: '#8f4428',
      contrastText: '#fff8f3',
    },
    background: {
      default: '#f4efe8',
      paper: '#fffaf5',
    },
    text: {
      primary: '#182532',
      secondary: '#516274',
    },
    success: {
      main: '#2f7d4b',
    },
    warning: {
      main: '#b46f15',
    },
    divider: '#d8cbb9',
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.1,
    },
    h2: {
      fontSize: '1.625rem',
      fontWeight: 700,
      lineHeight: 1.15,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 700,
      lineHeight: 1.25,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.9375rem',
      lineHeight: 1.55,
    },
    button: {
      fontSize: '1rem',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%',
        },
        body: {
          minHeight: '100%',
          overflowX: 'hidden',
          background:
            'radial-gradient(circle at top, rgba(196, 107, 72, 0.16), transparent 30%), linear-gradient(180deg, #fffdf8 0%, #f4efe8 100%)',
        },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 999,
          paddingInline: 20,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 18px 40px rgba(24, 37, 50, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
    },
  },
})