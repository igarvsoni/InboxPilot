import { useState } from 'react'
import axios from 'axios'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import {
  AssignmentOutlined,
  AutoAwesome,
  ContentCopy,
  Done,
  EventOutlined,
  LocationOnOutlined,
  ScheduleOutlined,
} from '@mui/icons-material'

const API = 'http://localhost:8080/api/email'

export default function App() {
  const [emailContent, setEmailContent] = useState('')
  const [tone, setTone] = useState('')
  const [reply, setReply] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [loadingReply, setLoadingReply] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoadingReply(true)
    setError('')
    setReply('')
    try {
      const res = await axios.post(`${API}/generate`, { emailContent, tone })
      setReply(res.data)
    } catch {
      setError('Failed to generate reply. Please try again.')
    } finally {
      setLoadingReply(false)
    }
  }

  const handleAnalyze = async () => {
    setLoadingAnalysis(true)
    setError('')
    setAnalysis(null)
    try {
      const res = await axios.post(`${API}/analyze`, { emailContent })
      setAnalysis(res.data)
    } catch {
      setError('Failed to analyze email. Please try again.')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasContent = emailContent.trim().length > 0

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', py: 4 }}>
      <Container maxWidth="md">

        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#fff', letterSpacing: '-1px' }}>
            InboxPilot
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
            Smart replies, tasks & events — extracted from any email
          </Typography>
        </Box>

        {/* Input Card */}
        <Card sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
              Paste Email
            </Typography>
            <TextField
              multiline
              rows={6}
              fullWidth
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Paste the email you received here..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#7c6bff' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)' },
              }}
            />

            <Box display="flex" gap={2} mt={2} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tone</InputLabel>
                <Select
                  value={tone}
                  label="Tone"
                  onChange={(e) => setTone(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="casual">Casual</MenuItem>
                  <MenuItem value="friendly">Friendly</MenuItem>
                  <MenuItem value="formal">Formal</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={!hasContent || loadingReply}
                startIcon={loadingReply ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                sx={{ background: 'linear-gradient(135deg, #7c6bff, #5a4fcf)', borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
              >
                {loadingReply ? 'Generating...' : 'Generate Reply'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleAnalyze}
                disabled={!hasContent || loadingAnalysis}
                startIcon={loadingAnalysis ? <CircularProgress size={16} color="inherit" /> : <AssignmentOutlined />}
                sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#7c6bff', background: 'rgba(124,107,255,0.1)' } }}
              >
                {loadingAnalysis ? 'Analyzing...' : 'Extract Tasks & Events'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Error */}
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* Generated Reply */}
        {reply && (
          <Card sx={{ borderRadius: 3, background: 'rgba(124,107,255,0.1)', border: '1px solid rgba(124,107,255,0.3)', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" sx={{ color: '#a89eff', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                  Generated Reply
                </Typography>
                <Button
                  size="small"
                  onClick={handleCopy}
                  startIcon={copied ? <Done fontSize="small" /> : <ContentCopy fontSize="small" />}
                  sx={{ color: copied ? '#4caf50' : '#a89eff', textTransform: 'none', fontSize: 12 }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Box>
              <TextField
                multiline
                fullWidth
                value={reply}
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(124,107,255,0.2)' },
                  },
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Tasks & Events */}
        {analysis && (
          <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>

            {/* Tasks */}
            <Card sx={{ flex: 1, borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <AssignmentOutlined sx={{ color: '#ff9f7f', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ color: '#ff9f7f', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                    Tasks
                  </Typography>
                  <Chip label={analysis.tasks?.length || 0} size="small" sx={{ background: 'rgba(255,159,127,0.2)', color: '#ff9f7f', height: 18, fontSize: 10 }} />
                </Box>
                {analysis.tasks?.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {analysis.tasks.map((task, i) => (
                      <Box key={i} display="flex" alignItems="flex-start" gap={1.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#ff9f7f', mt: 0.8, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{task}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>No tasks found</Typography>
                )}
              </CardContent>
            </Card>

            {/* Events */}
            <Card sx={{ flex: 1, borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EventOutlined sx={{ color: '#7fe0ff', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ color: '#7fe0ff', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                    Events
                  </Typography>
                  <Chip label={analysis.events?.length || 0} size="small" sx={{ background: 'rgba(127,224,255,0.2)', color: '#7fe0ff', height: 18, fontSize: 10 }} />
                </Box>
                {analysis.events?.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {analysis.events.map((event, i) => (
                      <Box key={i}>
                        {i > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 2 }} />}
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#fff', mb: 0.5 }}>{event.title || 'Untitled Event'}</Typography>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          {event.date && (
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <EventOutlined sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{event.date}</Typography>
                            </Box>
                          )}
                          {event.time && (
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <ScheduleOutlined sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{event.time}</Typography>
                            </Box>
                          )}
                          {event.location && (
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <LocationOnOutlined sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{event.location}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>No events found</Typography>
                )}
              </CardContent>
            </Card>

          </Box>
        )}

      </Container>
    </Box>
  )
}
