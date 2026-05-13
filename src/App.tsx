import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Image as ImageIcon, History, Layers, Palette, Layout as LayoutIcon, Type, MousePointer2, Wand2, LogOut, User as UserIcon, CheckCircle2, Lock, Zap, ShieldCheck, Plus, Trash2, Eye, X, Upload, FileText, Scissors, AlertCircle, Info, Bookmark, Globe, Layers as BatchIcon, Copy, Share2 } from 'lucide-react'

type PromptData = {
  id?: number
  projectId: string
  timestamp: string
  content?: string
  promptText: string
  imageUrl: string
  category: string
  style: string
  tone: string
  aspectRatio: string
  isPublic?: boolean
  likes?: number
  tags?: string
  folderId?: number
  suggestedPalette?: string // JSON string
  suggestedIcons?: string // JSON string
}

type User = {
  id: string
  email: string
  name: string
  avatar: string
  role: string
  usageCount: number
  limit: number
  profileComplete: boolean
  address?: string
  contact?: string
  resetDate?: string
}

type AdminStats = {
  totalUsers: number
  totalGenerations: number
  users: User[]
  recentPrompts: any[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3334'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<PromptData[]>([])
  const [view, setView] = useState<'constructor' | 'admin' | 'gallery' | 'library'>('constructor')
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [viewUser, setViewUser] = useState<User | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [gallery, setGallery] = useState<PromptData[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchSubjects, setBatchSubjects] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)
  const [summarizeProgress, setSummarizeProgress] = useState(0)
  const [folders, setFolders] = useState<any[]>([])
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)

  const filteredHistory = selectedFolder 
    ? history.filter(h => h.folderId === selectedFolder)
    : history

  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false)

  // Profiling States
  const [isProfilingModalOpen, setIsProfilingModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    contact: '',
    province: '',
    regency: '',
    district: '',
    village: ''
  })
  const [provinces, setProvinces] = useState<any[]>([])
  const [regencies, setRegencies] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [villages, setVillages] = useState<any[]>([])
  const [profilingLoading, setProfilingLoading] = useState(false)

  const [formData, setFormData] = useState({
    content: '',
    type: 'Edukasi',
    style: '3D Render',
    layout: 'Centralized',
    design: 'Minimalist',
    icon: 'Flat',
    tone: 'Professional',
    template: 'Timeline',
    platform: 'DALL-E 3',
    aspectRatio: '1:1',
    negativePrompt: ['Low Quality'] as string[],
    enhance: true
  })
  const [result, setResult] = useState<PromptData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)

  // Source States
  const [sourceText, setSourceText] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [customAlert, setCustomAlert] = useState<{ title: string, message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({ title, message, type })
  }

  useEffect(() => {
    checkAuth()
    handleAuthCallback()
    fetchFolders()
  }, [])

  useEffect(() => {
    if (user) {
      fetchHistory()
      fetchPresets()
      if (user.role === 'admin') {
        fetchAdminStats()
      }
    }
    fetchGallery()
  }, [user])

  const checkAuth = async () => {
    const token = localStorage.getItem('pixel_token')
    console.log('Checking auth with token:', !!token)
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('Auth check response status:', res.status)
      if (res.ok) {
        const userData = await res.json()
        console.log('Auth successful, user:', userData.name)
        setUser(userData)
        if (!userData.profileComplete && userData.role !== 'admin') {
            setIsProfilingModalOpen(true)
            fetchProvinces()
        }
      } else {
        console.error('Auth check failed with status:', res.status)
        localStorage.removeItem('pixel_token')
      }
    } catch (e) {
      console.error('Auth check exception:', e)
    }
  }

  const handleAuthCallback = () => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    console.log('URL params token found:', !!token)
    if (token) {
      localStorage.setItem('pixel_token', token)
      window.history.replaceState({}, document.title, "/")
      checkAuth()
    }
  }

  const handleLogin = () => {
    console.log("Redirecting to login...");
    window.location.href = `${API_URL}/api/auth/google`
  }

  const handleLogout = () => {
    localStorage.removeItem('pixel_token')
    setUser(null)
  }

  const fetchProvinces = async () => {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    const data = await res.json()
    setProvinces(data)
  }

  const fetchRegencies = async (provinceId: string) => {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`)
    const data = await res.json()
    setRegencies(data)
  }

  const fetchDistricts = async (regencyId: string) => {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`)
    const data = await res.json()
    setDistricts(data)
  }

  const fetchVillages = async (districtId: string) => {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${districtId}.json`)
    const data = await res.json()
    setVillages(data)
  }

  const handleProfileSubmit = async () => {
    setProfilingLoading(true)
    try {
      const token = localStorage.getItem('pixel_token')
      const address = `${profileForm.village}, ${profileForm.district}, ${profileForm.regency}, ${profileForm.province}`
      const res = await fetch(`${API_URL}/api/v1/profile`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
            name: profileForm.name, 
            contact: profileForm.contact, 
            address: address 
        })
      })
      if (res.ok) {
        showAlert('Berhasil', 'Profil berhasil diperbarui!', 'success')
        setIsProfilingModalOpen(false)
        checkAuth() // Refresh user data
      } else {
        const text = await res.text()
        let errorMessage = 'Unknown error'
        try {
            const err = JSON.parse(text)
            errorMessage = err.error || errorMessage
        } catch (e) {
            errorMessage = text || `Status: ${res.status}`
        }
        showAlert('Gagal', `Gagal memperbarui profil: ${errorMessage}`, 'error')
      }
    } catch (e: any) {
        console.error(e)
        showAlert('Kesalahan', `Terjadi kesalahan: ${e.message}`, 'error')
    } finally {
        setProfilingLoading(false)
    }
  }

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem('pixel_token')
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ email: newUserEmail, name: newUserName, role: newUserRole })
      })
      if (res.ok) {
        setIsAddUserModalOpen(false)
        setNewUserEmail('')
        setNewUserName('')
        fetchAdminStats()
      }
    } catch (e) {
        console.error(e)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Semua data terkait juga akan dihapus.')) return
    try {
      const token = localStorage.getItem('pixel_token')
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchAdminStats()
      }
    } catch (e) {
        console.error(e)
    }
  }

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('pixel_token')
      if (!token) return
      
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAdminStats(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchGallery = async () => {
    try {
      const res = await fetch(`${API_URL}/api/gallery`)
      const data = await res.json()
      setGallery(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const fetchPresets = async () => {
    try {
      const token = localStorage.getItem('pixel_token')
      if (!token) return
      const res = await fetch(`${API_URL}/api/presets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setPresets(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const savePreset = async () => {
    const name = prompt('Masukkan nama preset:')
    if (!name) return
    try {
      const token = localStorage.getItem('pixel_token')
      await fetch(`${API_URL}/api/presets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name, config: formData })
      })
      showAlert('Berhasil', 'Preset berhasil disimpan!', 'success')
      fetchPresets()
    } catch (e) { console.error(e) }
  }

  const deletePreset = async (id: number) => {
    if (!confirm('Hapus preset ini?')) return
    try {
      const token = localStorage.getItem('pixel_token')
      await fetch(`${API_URL}/api/presets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchPresets()
      showAlert('Dihapus', 'Preset telah dihapus.', 'info')
    } catch (e) { console.error(e) }
  }

  const toggleVisibility = async (id: number, isPublic: boolean) => {
    try {
      const token = localStorage.getItem('pixel_token')
      await fetch(`${API_URL}/api/prompts/${id}/visibility`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ isPublic })
      })
      fetchHistory()
      fetchGallery()
      showAlert('Berhasil', isPublic ? 'Dipublikasikan ke Gallery!' : 'Diset ke Private', 'success')
    } catch (e) { console.error(e) }
  }

  const handleBatchGenerate = async () => {
    const subjects = batchSubjects.split('\n').filter(s => s.trim() !== '')
    if (subjects.length === 0) {
        showAlert('Error', 'Masukkan setidaknya satu subjek.', 'error')
        return
    }
    
    setBatchLoading(true)
    let successCount = 0
    
    for (const subject of subjects) {
        try {
            const token = localStorage.getItem('pixel_token')
            const res = await fetch(`${API_URL}/api/generate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ ...formData, content: subject })
            })
            if (res.ok) successCount++
            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 1200))
        } catch (e) { console.error(e) }
    }
    
    setBatchLoading(false)
    setIsBatchModalOpen(false)
    setBatchSubjects('')
    fetchHistory()
    checkAuth()
    showAlert('Batch Selesai', `${successCount} prompt berhasil dibuat!`, 'success')
  }

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('pixel_token')
      const headers: any = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const res = await fetch(`${API_URL}/api/history`, { headers })
      const data = await res.json()
      setHistory(data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchFolders = async () => {
    const token = localStorage.getItem('pixel_token')
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/folders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setFolders(data)
    } catch (e) {
      console.error('Failed to fetch folders')
    }
  }

  const handleUpdateMeta = async (promptId: number, tags: string, folderId?: number) => {
    const token = localStorage.getItem('pixel_token')
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/prompts/${promptId}/meta`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tags, folderId })
      })
      if (res.ok) {
        fetchHistory()
        showAlert('Berhasil', 'Metadata diperbarui!', 'success')
      }
    } catch (e) {
      showAlert('Gagal', 'Gagal memperbarui metadata.', 'error')
    }
  }

  const handleCreateFolder = async (name: string) => {
    const token = localStorage.getItem('pixel_token')
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      })
      if (res.ok) {
        fetchFolders()
        showAlert('Berhasil', 'Folder dibuat!', 'success')
      }
    } catch (e) {
      showAlert('Gagal', 'Gagal membuat folder.', 'error')
    }
  }
  const handleImageAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzingImage(true)
    const token = localStorage.getItem('pixel_token')
    
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch(`${API_URL}/api/analyze-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      
      const data = await res.json()
      if (data.prompt) {
        setFormData(prev => ({ ...prev, content: data.prompt }))
        showAlert('Berhasil', 'Gambar berhasil dianalisis menjadi prompt!', 'success')
      } else {
        showAlert('Gagal', data.error || 'Gagal menganalisis gambar.', 'error')
      }
    } catch (e) {
      showAlert('Error', 'Terjadi kesalahan saat menghubungi server.', 'error')
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  const handleGenerate = async () => {
    if (isLimitReached) {
        setIsLimitModalOpen(true)
        return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('pixel_token')
      const headers: any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })
      
      if (res.status === 403) {
          const data = await res.json()
          setLimitError(data.message)
          setLoading(false)
          return
      }

      const data = await res.json()
      setResult(data)
      setIsModalOpen(true)
      fetchHistory()
      checkAuth() // Update usage count
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!result) return
    const headers = "Project ID,Timestamp,Content,Prompt\n"
    const row = `${result.projectId},${result.timestamp},${result.content},"${result.promptText.replace(/"/g, '""')}"`
    const blob = new Blob([headers + row], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pixel_${result.projectId}.csv`
    a.click()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setSourceText(content)
      showAlert('Berhasil', 'Sumber berhasil diunggah!', 'success')
    }
    reader.readAsText(file)
  }

  const handleSummarize = async () => {
    if (!sourceText) {
        showAlert('Perhatian', 'Silakan unggah atau masukkan sumber terlebih dahulu.', 'info')
        return
    }
    setSummarizing(true)
    setSummarizeProgress(0)

    const progressInterval = setInterval(() => {
        setSummarizeProgress(prev => {
            if (prev >= 90) return prev
            return prev + (90 - prev) * 0.1
        })
    }, 200)

    try {
      const res = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText })
      })
      const data = await res.json()
      if (res.status === 429) {
        showAlert('Limit Tercapai', data.message || 'Limit API Gemini tercapai. Silakan coba lagi nanti atau gunakan tombol "Samakan dengan Sumber".', 'error')
        return
      }
      
      if (data.summary) {
        setSummarizeProgress(100)
        setTimeout(() => {
            setFormData({ ...formData, content: data.summary })
        }, 300)
      }
    } catch (e) {
      console.error(e)
      showAlert('Gagal', 'Gagal meringkas sumber.', 'error')
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setSummarizing(false)
        setSummarizeProgress(0)
      }, 800)
    }
  }

  const SelectorCard = ({ label, icon: Icon, value, options, field, description }: any) => (
    <div className={`glass p-4 md:p-5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group flex flex-col justify-between space-y-3 md:space-y-4 ${user && user.role === 'user' && user.usageCount >= user.limit ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Icon size={16} className="md:size-[18px]" />
          <h3 className="text-[11px] md:text-sm font-bold uppercase tracking-wider">{label}</h3>
        </div>
        <p className="hidden md:block text-[11px] text-muted-foreground">{description}</p>
      </div>
      <select 
        value={value}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none cursor-pointer"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-primary animate-bounce">
            <Sparkles size={18} />
            <span className="text-xs font-bold tracking-widest uppercase">Next-Gen Prompt Engineering</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
              PIXEL <span className="text-primary italic">STUDIO</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Arsitektur Prompt Infografis Profesional. Didukung oleh Kecerdasan Buatan untuk Hasil Visual Maksimal.
            </p>
          </div>

          <div className="flex flex-col items-center gap-8">
            <button 
              onClick={handleLogin}
              className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/20"
            >
              <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
              MULAI BERKREASI SEKARANG
              <MousePointer2 size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>
            
            <div className="flex items-center gap-12 pt-8 border-t border-white/5">
                <div className="text-center">
                    <p className="text-2xl font-black text-white">1.2k+</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">Users</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-white">15k+</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">Prompts</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-white">Gemini</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">Engine</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isLimitReached = user.role === 'user' && user.usageCount >= user.limit;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl">
              <Sparkles className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tighter">PIXEL <span className="text-primary">STUDIO</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              <button 
                onClick={() => setView('constructor')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'constructor' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-white/5 text-muted-foreground'}`}
              >
                <Wand2 size={14} />
                Constructor
              </button>
              <button 
                onClick={() => setView('gallery')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'gallery' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-white/5 text-muted-foreground'}`}
              >
                <Globe size={14} />
                Gallery
              </button>
              <button 
                onClick={() => setView('library')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'library' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-white/5 text-muted-foreground'}`}
              >
                <History size={14} />
                Library
              </button>
              {user.role === 'admin' && (
                <button 
                  onClick={() => setView('admin')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-white/5 text-muted-foreground'}`}
                >
                  <ShieldCheck size={14} />
                  Admin
                </button>
              )}
            </div>
            <button 
                onClick={() => setIsLimitModalOpen(true)}
                className="flex items-center gap-2 bg-secondary/30 px-3 py-1 rounded-full border border-white/5 hover:bg-white/5 transition-all"
            >
                <Zap size={14} className={isLimitReached ? 'text-red-500' : 'text-yellow-500'} />
                <span className="text-[11px] font-black uppercase tracking-widest">
                    {user.role === 'admin' ? 'UNLIMITED' : `${user.usageCount} / ${user.limit}`} Tokens
                </span>
            </button>
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-secondary/50 rounded-full border border-border">
              <img src={user.avatar} className="w-7 h-7 rounded-full" alt={user.name} />
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-primary leading-none uppercase">{user.role}</span>
                <span className="text-xs font-bold leading-tight">{user.name}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="hidden md:block p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 pb-32 md:pb-12 space-y-12">
        {view === 'gallery' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-2 text-center py-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 text-primary mb-4">
                    <Globe size={16} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Community Showcase</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight uppercase italic">Prompt Gallery</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">Inspirasi prompt infografis dari komunitas PIXEL di seluruh dunia.</p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gallery.length > 0 ? gallery.map((item) => (
                    <div key={item.projectId} className="glass rounded-[32px] overflow-hidden border border-white/5 hover:border-primary/30 transition-all group flex flex-col h-full">
                        <div className="p-8 space-y-6 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/20 p-2 rounded-xl">
                                        <Sparkles size={16} className="text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prompt Refined</span>
                                </div>
                                <span className="text-[10px] font-mono text-primary bg-primary/10 px-3 py-1 rounded-full">{item.projectId}</span>
                            </div>
                            <div className="bg-secondary/50 p-6 rounded-2xl border border-white/5 relative min-h-[120px]">
                                <p className="text-sm font-bold leading-relaxed italic text-white/90 line-clamp-4">"{item.promptText}"</p>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(item.promptText)
                                        showAlert('Disalin', 'Prompt berhasil disalin ke clipboard!', 'success')
                                    }}
                                    className="absolute bottom-4 right-4 p-2 bg-white/10 hover:bg-primary text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded-md border border-white/5 text-muted-foreground">{item.style}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded-md border border-white/5 text-muted-foreground">{item.tone}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded-md border border-white/5 text-muted-foreground">{item.aspectRatio}</span>
                            </div>
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black">P</div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Pixel User</span>
                             </div>
                             <button 
                                onClick={() => {
                                    setFormData({ ...formData, style: item.style, tone: item.tone, aspectRatio: item.aspectRatio })
                                    setView('constructor')
                                    showAlert('Remix', 'Pengaturan prompt diterapkan!', 'success')
                                }}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:translate-x-1 transition-all"
                             >
                                Remix <Wand2 size={12} />
                             </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center opacity-30 space-y-4">
                        <Globe size={64} className="mx-auto" />
                        <p className="font-black uppercase tracking-widest">Gallery masih kosong</p>
                    </div>
                )}
            </div>
          </div>
        ) : view === 'library' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-2 text-center py-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 text-primary mb-4">
                    <History size={16} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Personal Library</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight uppercase italic">My Project History</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">Kelola semua prompt dan hasil kreasi infografis Anda di satu tempat.</p>
            </section>

            {/* Folder Filter */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
                <button 
                    onClick={() => setSelectedFolder(null)}
                    className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedFolder === null ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                >
                    All Projects
                </button>
                {folders.map(f => (
                    <button 
                        key={f.id}
                        onClick={() => setSelectedFolder(f.id)}
                        className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedFolder === f.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                    >
                        {f.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredHistory.length > 0 ? filteredHistory.slice().reverse().map((item) => (
                    <div key={item.projectId} className="glass rounded-[32px] overflow-hidden border border-white/5 hover:border-primary/30 transition-all group flex flex-col h-full cursor-pointer" onClick={() => { setResult(item); setIsModalOpen(true); }}>
                        <div className="p-8 space-y-6 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/20 p-2 rounded-xl text-primary">
                                        <History size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                                </div>
                                <span className="text-[10px] font-mono text-primary bg-primary/10 px-3 py-1 rounded-full">{item.projectId}</span>
                            </div>
                            <div className="bg-secondary/50 p-6 rounded-2xl border border-white/5 min-h-[120px]">
                                <p className="text-sm font-bold leading-relaxed italic text-white/90 line-clamp-4">"{item.promptText}"</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded-md border border-white/5 text-muted-foreground">{item.style}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded-md border border-white/5 text-muted-foreground">{item.tone}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded-md border border-white/5 text-muted-foreground">{item.aspectRatio}</span>
                            </div>
                            
                            {item.tags && (
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    {item.tags.split(',').map((tag, idx) => (
                                        <span key={idx} className="text-[8px] font-bold text-primary/70 uppercase tracking-tighter">#{tag.trim()}</span>
                                    ))}
                                </div>
                            )}

                            {item.folderId && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                                    <Bookmark size={10} />
                                    {folders.find(f => f.id === item.folderId)?.name || 'Unknown Folder'}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleVisibility(item.id!, !item.isPublic)
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${item.isPublic ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground border border-white/5'}`}
                                >
                                    {item.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                                    {item.isPublic ? 'Public' : 'Private'}
                                </button>
                             </div>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setFormData({ ...formData, style: item.style, tone: item.tone, aspectRatio: item.aspectRatio, content: item.content || '' })
                                    setView('constructor')
                                    showAlert('Remix', 'Pengaturan dimuat ke Constructor!', 'success')
                                }}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:translate-x-1 transition-all"
                             >
                                Edit <Wand2 size={12} />
                             </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center opacity-30 space-y-4">
                        <History size={64} className="mx-auto" />
                        <p className="font-black uppercase tracking-widest">Belum ada riwayat proyek</p>
                    </div>
                )}
            </div>
          </div>
        ) : view === 'admin' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <section className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Admin Control Room</h2>
                <p className="text-muted-foreground">Monitor aktivitas platform dan manajemen pengguna secara real-time.</p>
            </section>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass p-8 rounded-3xl border border-white/5 flex items-center gap-6">
                <div className="p-4 bg-primary/20 rounded-2xl text-primary">
                  <UserIcon size={32} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Pengguna</p>
                  <p className="text-4xl font-black">{adminStats?.totalUsers || 0}</p>
                </div>
              </div>
              <div className="glass p-8 rounded-3xl border border-white/5 flex items-center gap-6">
                <div className="p-4 bg-yellow-500/20 rounded-2xl text-yellow-500">
                  <Wand2 size={32} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Generasi</p>
                  <p className="text-4xl font-black">{adminStats?.totalGenerations || 0}</p>
                </div>
              </div>
              <div className="glass p-8 rounded-3xl border border-white/5 flex items-center gap-6">
                <div className="p-4 bg-green-500/20 rounded-2xl text-green-500">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Server Status</p>
                  <p className="text-4xl font-black">ONLINE</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               {/* User List */}
               <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                      <UserIcon size={18} className="text-primary" />
                      Manajemen Pengguna
                    </h3>
                    <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-black hover:bg-primary/30 transition-all border border-primary/20"
                    >
                        <Plus size={14} />
                        TAMBAH PENGGUNA
                    </button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">
                          <th className="p-6">Pengguna</th>
                          <th className="p-6">Role</th>
                          <th className="p-6">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adminStats?.users.map((u) => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <img src={u.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                                <div>
                                  <p className="text-sm font-bold">{u.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${u.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2 transition-opacity">
                                <button 
                                    onClick={() => setViewUser(u)}
                                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                    title="View Profile"
                                >
                                    <Eye size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                    title="Delete User"
                                >
                                    <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               </div>

               {/* Recent Prompts */}
               <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                      <History size={18} className="text-primary" />
                      Log Generasi Terbaru
                    </h3>
                 </div>
                 <div className="p-6 space-y-4">
                    {adminStats?.recentPrompts.map((p) => (
                      <div key={p.id} className="p-4 bg-secondary/30 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-primary">{p.project_id}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(p.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-medium line-clamp-2 italic text-white/70 mb-2">"{p.prompt_text}"</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 rounded border border-white/10">{p.model}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 rounded border border-white/10">{p.style}</span>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Dashboard */}
            <section className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Dashboard Arsitek</h2>
                <p className="text-muted-foreground">Konfigurasi visual untuk proyek infografis Anda berikutnya.</p>
            </section>

        <div className="grid grid-cols-1 gap-8">
            {/* Constructor Grid */}
            <div className="col-span-full space-y-8">
                <div className="glass rounded-3xl border border-white/5 relative overflow-hidden flex flex-col max-h-[85vh]">
                    {isLimitReached && (
                        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 space-y-6">
                            <div className="bg-red-500/20 p-6 rounded-full border border-red-500/50">
                                <Lock size={48} className="text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Akses Terkunci</h2>
                                <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                                    Anda telah mencapai batas 3 generate dalam 7 hari. Silakan tunggu hari ke-8 atau upgrade ke PRO untuk akses tanpa batas.
                                </p>
                            </div>
                            <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20">
                                UPGRADE KE PRO SEKARANG
                            </button>
                        </div>
                    )}

                    <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-xl font-black tracking-tight uppercase">Constructor Engine</h2>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Presets Dropdown */}
                                <div className="relative group">
                                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                                        <Bookmark size={14} className="text-primary" />
                                        Presets
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                                        <div className="p-2 space-y-1">
                                            {presets.length > 0 ? presets.map(p => (
                                                <div key={p.id} className="flex items-center justify-between group/item">
                                                    <button 
                                                        onClick={() => {
                                                            setFormData(JSON.parse(p.config))
                                                            showAlert('Preset Dimuat', `Gaya "${p.name}" diterapkan!`, 'success')
                                                        }}
                                                        className="flex-1 text-left px-4 py-2 hover:bg-primary/20 rounded-lg text-[10px] font-bold uppercase transition-all truncate"
                                                    >
                                                        {p.name}
                                                    </button>
                                                    <button onClick={() => deletePreset(p.id)} className="p-2 opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-all">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )) : <p className="p-4 text-[10px] text-muted-foreground uppercase font-black text-center">Belum ada preset</p>}
                                            <div className="border-t border-white/5 mt-1 pt-1">
                                                <button onClick={savePreset} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-primary text-white rounded-lg text-[10px] font-black uppercase transition-all">
                                                    <Plus size={12} /> Save Current
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setIsBatchModalOpen(true)}
                                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    <BatchIcon size={14} className="text-primary" />
                                    Bulk Creator
                                </button>

                                <div className={`flex items-center gap-3 bg-primary/10 px-4 py-2.5 rounded-xl border border-primary/20 transition-opacity ${isLimitReached ? 'opacity-40 grayscale' : ''}`}>
                                    <Sparkles size={16} className="text-primary" />
                                    <div className="hidden sm:flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary leading-none">AI Enhance</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.enhance}
                                        onChange={(e) => setFormData({...formData, enhance: e.target.checked})}
                                        disabled={isLimitReached}
                                        className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed" 
                                    />
                                </div>
                            </div>
                        </div>

                    {/* Content Input Card */}
                    <div className={`bg-secondary/30 p-6 rounded-2xl border border-border space-y-6 ${isLimitReached ? 'opacity-30' : ''}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-primary">
                                <Layers size={18} />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Subjek Utama & Konten</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileUpload} 
                                    className="hidden" 
                                    accept=".txt,.md"
                                />
                                <input 
                                    type="file" 
                                    id="image-analyzer"
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageAnalyze}
                                />
                                <button 
                                    onClick={() => document.getElementById('image-analyzer')?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl text-[11px] font-black hover:bg-yellow-500/20 transition-all uppercase tracking-widest"
                                    disabled={isAnalyzingImage}
                                >
                                    {isAnalyzingImage ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-500/30 border-t-yellow-500" /> : <ImageIcon size={14} />}
                                    {isAnalyzingImage ? 'ANALYZING...' : 'IMAGE TO PROMPT'}
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[11px] font-black hover:bg-primary/20 transition-all uppercase tracking-widest"
                                >
                                    <Upload size={14} />
                                    UNGGAH SUMBER
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <textarea 
                                placeholder="Tuliskan subjek infografis Anda di sini... (Misal: Evolusi Teknologi AI, Siklus Hidup Baterai Lithium)"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full bg-transparent border-none text-xl md:text-2xl font-medium outline-none focus:ring-0 placeholder:text-muted-foreground/30 resize-none min-h-[200px] custom-scrollbar whitespace-pre-wrap"
                                disabled={isLimitReached}
                            />

                            {/* Source Actions */}
                            <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${sourceText ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-muted-foreground'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Referensi Sumber</span>
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                            {sourceText ? `${sourceText.length} Karakter Terdeteksi` : 'Belum ada sumber yang diunggah'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setFormData({ ...formData, content: sourceText })}
                                        disabled={!sourceText || isLimitReached}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-2xl text-[11px] font-black transition-all border border-white/10 disabled:opacity-20 shadow-xl shadow-black/20"
                                    >
                                        <Wand2 size={14} />
                                        SAMAKAN DENGAN SUMBER
                                    </button>
                                    <button 
                                        onClick={handleSummarize}
                                        disabled={!sourceText || summarizing || isLimitReached}
                                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl text-[11px] font-black transition-all shadow-xl shadow-primary/20 disabled:opacity-20 ${isLimitReached ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {summarizing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : (isLimitReached ? <Lock size={14} /> : <Scissors size={14} />)}
                                        RINGKAS SUMBER
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {summarizing && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                                        <span>Meringkas Konten...</span>
                                        <span>{Math.round(summarizeProgress)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                            style={{ width: `${summarizeProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grid of Selectors 3x3 */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        <SelectorCard label="Tipe Media" icon={Type} value={formData.type} field="type" options={['Edukasi', 'Marketing', 'Infografis', 'Presentasi']} description="Format utama visual Anda" />
                        <SelectorCard label="Template" icon={LayoutIcon} value={formData.template} field="template" options={['Timeline', 'Comparison', 'Process Flow', 'Hierarchy', 'Statistical', 'Mind Map', 'SWOT Analysis']} description="Struktur tata letak data" />
                        <SelectorCard label="Gaya Visual" icon={Palette} value={formData.style} field="style" options={['3D Render', 'Amigurumi', 'Diorama', 'Flat Design', 'Isometric', 'Neumorphism']} description="Estetika keseluruhan gambar" />
                        <SelectorCard label="Layout" icon={LayoutIcon} value={formData.layout} field="layout" options={['Centralized', 'Hierarchical', 'Grid', 'Split']} description="Penataan elemen visual" />
                        <SelectorCard label="Desain" icon={Layers} value={formData.design} field="design" options={['Minimalist', 'Complex', 'Modern', 'Vintage']} description="Tingkat kedetailan visual" />
                        <SelectorCard label="Tone" icon={Wand2} value={formData.tone} field="tone" options={['Professional', 'Friendly', 'Playful', 'Serious']} description="Suasana emosional gambar" />
                        <SelectorCard label="Platform" icon={Sparkles} value={formData.platform} field="platform" options={['DALL-E 3', 'Midjourney v6', 'Stable Diffusion']} description="Optimasi untuk engine tertentu" />
                        <SelectorCard label="Aspect Ratio" icon={LayoutIcon} value={formData.aspectRatio} field="aspectRatio" options={['1:1', '16:9', '9:16', '4:3', '3:2']} description="Dimensi ukuran gambar" />
                        <SelectorCard label="Icon Style" icon={ImageIcon} value={formData.icon} field="icon" options={['Flat', '3D Glossy', 'Outline', 'Hand-drawn']} description="Gaya ikon pendukung" />
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-secondary/10 backdrop-blur-md">
                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !formData.content || isLimitReached}
                        className="w-full bg-white text-black py-5 rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                    >
                        {loading ? <div className="animate-spin rounded-full h-6 w-6 border-4 border-black/30 border-t-black" /> : (isLimitReached ? <Lock size={24} /> : <Wand2 size={24} />)}
                        {loading ? 'GENERATING...' : (isLimitReached ? 'AKSES TERBATAS' : 'BANGUN PROMPT VISUAL')}
                    </button>
                </div>
                </div>
            </div>
          </div>
        </>
        )}
      </main>

      {/* Profiling Modal */}
      {isProfilingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass max-w-2xl w-full rounded-[40px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl">
                        <UserIcon className="text-white" size={24} />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="font-black text-2xl uppercase tracking-tighter">Profiling Pengguna</h3>
                        <p className="text-[11px] text-muted-foreground font-bold tracking-widest uppercase">Lengkapi data diri Anda untuk melanjutkan</p>
                    </div>
                </div>
            </div>
            
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-primary">Nama Lengkap</label>
                        <input 
                            type="text" 
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                            placeholder="Masukkan nama sesuai KTP"
                            className="w-full bg-secondary/50 border border-border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-primary">WhatsApp / Telegram</label>
                        <input 
                            type="text" 
                            value={profileForm.contact}
                            onChange={(e) => setProfileForm({...profileForm, contact: e.target.value})}
                            placeholder="0812xxxx atau @username"
                            className="w-full bg-secondary/50 border border-border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Informasi Wilayah</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Provinsi</label>
                            <select 
                                onChange={(e) => {
                                    const val = e.target.value
                                    if (!val) return
                                    const province = provinces.find(p => p.id === val)
                                    if (province) {
                                        setProfileForm({...profileForm, province: province.name})
                                        fetchRegencies(val)
                                    }
                                }}
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-white cursor-pointer appearance-none"
                            >
                                <option value="" className="bg-slate-900">Pilih Provinsi</option>
                                {provinces.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Kabupaten/Kota</label>
                            <select 
                                disabled={!regencies.length}
                                onChange={(e) => {
                                    const val = e.target.value
                                    if (!val) return
                                    const regency = regencies.find(r => r.id === val)
                                    if (regency) {
                                        setProfileForm({...profileForm, regency: regency.name})
                                        fetchDistricts(val)
                                    }
                                }}
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-white cursor-pointer appearance-none disabled:opacity-30"
                            >
                                <option value="" className="bg-slate-900">Pilih Kabupaten/Kota</option>
                                {regencies.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Kecamatan</label>
                            <select 
                                disabled={!districts.length}
                                onChange={(e) => {
                                    const val = e.target.value
                                    if (!val) return
                                    const district = districts.find(d => d.id === val)
                                    if (district) {
                                        setProfileForm({...profileForm, district: district.name})
                                        fetchVillages(val)
                                    }
                                }}
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-white cursor-pointer appearance-none disabled:opacity-30"
                            >
                                <option value="" className="bg-slate-900">Pilih Kecamatan</option>
                                {districts.map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Desa/Kelurahan</label>
                            <select 
                                disabled={!villages.length}
                                onChange={(e) => {
                                    const val = e.target.value
                                    if (!val) return
                                    const village = villages.find(v => v.id === val)
                                    if (village) {
                                        setProfileForm({...profileForm, village: village.name})
                                    }
                                }}
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-white cursor-pointer appearance-none disabled:opacity-30"
                            >
                                <option value="" className="bg-slate-900">Pilih Desa/Kelurahan</option>
                                {villages.map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleProfileSubmit}
                    disabled={profilingLoading || !profileForm.name || !profileForm.contact || !profileForm.village}
                    className="w-full bg-white text-black py-6 rounded-[32px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-white/10 flex items-center justify-center gap-3 mt-4"
                >
                    {profilingLoading ? <div className="animate-spin rounded-full h-6 w-6 border-4 border-black/30 border-t-black" /> : <CheckCircle2 size={24} />}
                    {profilingLoading ? 'MENYIMPAN...' : 'SELESAIKAN PROFILING'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <Plus size={18} className="text-primary" />
                    Tambah Pengguna Baru
                </h3>
                <button onClick={() => setIsAddUserModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Alamat Email</label>
                    <input 
                        type="email" 
                        value={newUserEmail} 
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Nama Lengkap</label>
                    <input 
                        type="text" 
                        value={newUserName} 
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Role</label>
                    <select 
                        value={newUserRole} 
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none cursor-pointer"
                    >
                        <option value="user">User</option>
                        <option value="pro">Pro</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button 
                    onClick={handleAddUser}
                    className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                >
                    SIMPAN PENGGUNA
                </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-lg w-full rounded-[40px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
             <div className="h-32 bg-gradient-to-r from-primary/20 to-blue-500/20 relative">
                <button onClick={() => setViewUser(null)} className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-all">
                    <X size={20} />
                </button>
             </div>
             <div className="px-10 pb-10 -mt-16 text-center space-y-8">
                <div className="relative inline-block">
                    <img src={viewUser?.avatar} className="w-32 h-32 rounded-[40px] border-8 border-background shadow-2xl mx-auto" alt="" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-background" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">{viewUser?.name}</h2>
                    <p className="text-primary font-bold tracking-widest text-xs uppercase">{viewUser?.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/30 p-6 rounded-3xl border border-white/5 text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Role</p>
                        <p className="font-black text-xl uppercase italic text-primary">{viewUser?.role}</p>
                    </div>
                    <div className="bg-secondary/30 p-6 rounded-3xl border border-white/5 text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Usage</p>
                        <p className="font-black text-xl uppercase italic text-yellow-500">{viewUser?.usageCount} / {viewUser?.limit}</p>
                    </div>
                </div>
                <div className="p-6 bg-primary/10 rounded-3xl border border-primary/20 text-left">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-3">Sistem Informasi</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[11px] font-bold text-muted-foreground">User ID</span>
                            <span className="text-[11px] font-mono">{viewUser?.id}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[11px] font-bold text-muted-foreground">Contact</span>
                            {viewUser.contact ? (
                                <a 
                                    href={viewUser?.contact?.startsWith('@') ? `https://t.me/${viewUser.contact.substring(1)}` : `https://wa.me/${viewUser?.contact?.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black bg-primary text-white px-3 py-1 rounded-lg hover:scale-105 transition-all flex items-center gap-1 shadow-lg shadow-primary/20"
                                >
                                    {viewUser?.contact?.startsWith('@') ? 'TELEGRAM' : 'WHATSAPP'}
                                    <Sparkles size={10} />
                                </a>
                            ) : (
                                <span className="text-[10px] font-black text-muted-foreground uppercase">N/A</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                            <span className="text-[11px] font-bold text-muted-foreground">Address</span>
                            <span className="text-[11px] font-medium text-white/80 leading-relaxed uppercase">{viewUser.address || 'DATA BELUM TERSEDIA'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-muted-foreground">Account Status</span>
                            <span className="text-[10px] font-black text-green-500 uppercase">Verified</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => setViewUser(null)}
                    className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all border border-white/5"
                >
                    CLOSE PROFILE
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Limit Reached Modal */}
      {isLimitModalOpen && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="glass max-w-lg w-full rounded-[40px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center space-y-8">
                <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/20">
                    <Zap className="text-red-500" size={40} />
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tight uppercase italic">{user && user.usageCount >= user.limit ? 'Limit Tercapai!' : 'Info Token'}</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed px-4">
                        Anda telah menggunakan <span className="text-white font-bold">{user?.usageCount} / {user?.limit}</span> token gratis Anda. 
                        Token akan di-reset secara otomatis pada:
                        <br />
                        <span className="text-primary font-black mt-2 block text-lg">
                            {user?.resetDate ? new Date(user.resetDate).toLocaleDateString('id-ID', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                            }) : 'Belum ada pemakaian'}
                        </span>
                    </p>
                </div>

                <div className="p-8 bg-primary/10 rounded-[32px] border border-primary/20 space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                        <Sparkles size={100} className="text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Pilihan Terbaik</p>
                        <h4 className="text-2xl font-black italic">PRO SUBSCRIPTION</h4>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <span className="text-4xl font-black">Rp 25.000</span>
                            <span className="text-xs text-muted-foreground font-bold">/ 30 HARI</span>
                        </div>
                        <p className="text-[10px] font-bold mt-4 uppercase tracking-widest text-primary/80">Mendapatkan 25 Token Premium</p>
                    </div>
                    
                    <button className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all relative z-10">
                        LANGGANAN SEKARANG
                    </button>
                </div>

                <button 
                    onClick={() => setIsLimitModalOpen(false)}
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-white transition-all"
                >
                    Tutup & Lihat Dashboard
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Result */}
      {isModalOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass max-w-3xl w-full rounded-[40px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl">
                  <Sparkles className="text-white" size={20} />
                </div>
                <h3 className="font-black text-xl uppercase tracking-tighter">Intelligence Output</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Interactive Prompt Editor</span>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Klik teks untuk menyalin bagian tertentu</p>
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 bg-amber-500/10 w-fit px-2 py-1 rounded-md">
                      <Info size={12} /> Paste prompt ini ke Midjourney, Leonardo.Ai, atau Bing Image Creator
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (result) {
                            navigator.clipboard.writeText(result.promptText)
                            showAlert('Disalin', 'Prompt berhasil disalin!', 'success')
                        }
                      }}
                      className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-all flex items-center gap-2"
                    >
                      <Copy size={12} /> Copy All
                    </button>
                    <button 
                      onClick={handleExportCSV}
                      className="text-[10px] font-black uppercase tracking-widest bg-secondary px-4 py-2 rounded-lg border border-white/10 hover:bg-secondary/80 transition-all flex items-center gap-2"
                    >
                      <FileText size={12} /> Export
                    </button>
                  </div>
                </div>
                
                <div className="p-8 bg-secondary/50 rounded-[32px] border border-white/5 text-xl md:text-2xl font-bold leading-tight tracking-tight text-white shadow-inner italic overflow-y-auto custom-scrollbar flex flex-wrap gap-x-2 gap-y-1">
                  {result?.promptText.split(/([.,!?;])|\s+/).filter(Boolean).map((word, i) => (
                    <span 
                        key={i} 
                        onClick={() => {
                            navigator.clipboard.writeText(word)
                            showAlert('Token Disalin', `"${word}" siap digunakan.`, 'info')
                        }}
                        className="hover:text-primary cursor-pointer transition-colors hover:bg-primary/10 rounded-md px-1 -mx-1"
                    >
                        {word}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Smart Color Palette */}
                <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Palette size={14} className="text-primary" />
                        Smart Palette
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    {JSON.parse(result.suggestedPalette || '[]').length > 0 ? JSON.parse(result.suggestedPalette!).map((color: string, i: number) => (
                      <div key={i} className="group relative flex-1 h-20 rounded-2xl border border-white/10 overflow-hidden cursor-pointer" style={{ backgroundColor: color }} onClick={() => { navigator.clipboard.writeText(color); showAlert('Hex Disalin', color, 'success'); }}>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[10px] font-black text-white">{color}</span>
                        </div>
                      </div>
                    )) : (
                        [1,2,3,4,5].map(i => <div key={i} className="flex-1 h-20 rounded-2xl bg-white/5 animate-pulse" />)
                    )}
                  </div>
                </div>

                {/* Smart Icons */}
                <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Sparkles size={14} className="text-yellow-500" />
                    Asset Suggestions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(result.suggestedIcons || '[]').length > 0 ? JSON.parse(result.suggestedIcons!).map((iconName: string, i: number) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Bookmark size={10} /> {iconName}
                      </span>
                    )) : (
                        <span className="text-[10px] text-muted-foreground italic">No suggestions available</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tagging & Folders */}
              <div className="glass p-8 rounded-[32px] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Project Folder</label>
                  <div className="flex gap-2">
                    <select 
                        value={result.folderId || ''} 
                        onChange={(e) => handleUpdateMeta(result.id!, result.tags || '', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="flex-1 bg-secondary/50 border border-white/5 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">No Folder</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <button 
                        onClick={() => {
                            const name = prompt('Nama folder baru:')
                            if (name) handleCreateFolder(name)
                        }}
                        className="bg-primary/20 text-primary p-3 rounded-2xl border border-primary/20 hover:bg-primary/30 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Tags (Pisahkan koma)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. marketing, 3d, social-media"
                    defaultValue={result.tags || ''}
                    onBlur={(e) => handleUpdateMeta(result.id!, e.target.value, result.folderId)}
                    className="w-full bg-secondary/50 border border-white/5 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full py-5 bg-primary text-white rounded-[24px] font-black text-xs uppercase tracking-[0.4em] transition-all border border-primary shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                SIMPAN & LANJUTKAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 z-[60]">
        <div className="glass bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-3 shadow-2xl flex items-center justify-between">
          <button 
            onClick={() => setView('constructor')}
            className={`flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl transition-all ${view === 'constructor' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground'}`}
          >
            <Wand2 size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Engine</span>
          </button>
          
          <button 
            onClick={() => setView('gallery')}
            className={`flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl transition-all ${view === 'gallery' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground'}`}
          >
            <Globe size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Gallery</span>
          </button>

          <button 
            onClick={() => setView('library')}
            className={`flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl transition-all ${view === 'library' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground'}`}
          >
            <History size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Library</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl text-red-500/80 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Exit</span>
          </button>
        </div>
      </nav>

      {/* Mobile Batch Generation Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass max-w-2xl w-full rounded-[40px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl text-white">
                        <BatchIcon size={20} />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="font-black text-xl uppercase tracking-tighter italic">Bulk Prompt Creator</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Generate banyak subjek sekaligus</p>
                    </div>
                </div>
                <button onClick={() => !batchLoading && setIsBatchModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X size={24} />
                </button>
            </div>
            
            <div className="p-10 space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-widest text-primary">Daftar Subjek (Satu per baris)</label>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">{batchSubjects.split('\n').filter(s => s.trim()).length} Subjek Terdeteksi</span>
                    </div>
                    <textarea 
                        value={batchSubjects}
                        onChange={(e) => setBatchSubjects(e.target.value)}
                        placeholder="Misal:&#10;Sejarah Internet&#10;Cara Kerja Cloud Computing&#10;Manfaat AI dalam Pendidikan"
                        className="w-full h-64 bg-secondary/50 border border-white/10 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-lg custom-scrollbar resize-none"
                        disabled={batchLoading}
                    />
                </div>

                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        <span className="text-primary font-black uppercase">Catatan:</span> Proses ini akan menggunakan 1 token untuk setiap subjek. Sistem akan memberikan jeda 1.2 detik antar generasi untuk menjaga stabilitas engine.
                    </p>
                </div>

                <button 
                    onClick={handleBatchGenerate}
                    disabled={batchLoading || !batchSubjects.trim()}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                    {batchLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-3 border-white/30 border-t-white" />
                            PROCESSING BATCH...
                        </>
                    ) : (
                        <>
                            <Zap size={18} />
                            START BULK GENERATION
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass max-w-sm w-full rounded-[32px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${
                customAlert?.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                customAlert?.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                'bg-primary/10 border-primary/20 text-primary'
              }`}>
                {customAlert?.type === 'success' ? <CheckCircle2 size={32} /> :
                 customAlert?.type === 'error' ? <AlertCircle size={32} /> :
                 <Info size={32} />}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight uppercase italic">{customAlert?.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {customAlert?.message}
                </p>
              </div>

              <button 
                onClick={() => setCustomAlert(null)}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border ${
                  customAlert?.type === 'success' ? 'bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20' :
                  customAlert?.type === 'error' ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20' :
                  'bg-primary text-white border-primary-600 shadow-lg shadow-primary/20'
                }`}
              >
                MENGERTI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
