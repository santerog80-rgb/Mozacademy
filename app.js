// ================================================
// MozAcademy - app.js
// Global JavaScript + Supabase Integration
// ================================================

// ── Supabase Configuration ──
// IMPORTANT: Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://fwacwpwdqkmykowxmffx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ci9XWHYXUqk01PZT5Jp0ug_VIrzP9cd';

// Initialize Supabase client
let supabase;
try {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.warn('Supabase not initialized:', e.message);
}

// ── App State ──
const App = {
  currentUser: null,
  currentCourse: null,

  // Initialize app
  async init() {
    this.setupSidebar();
    this.setupToast();
    await this.checkAuth();
    this.bindGlobalEvents();
  },

  // Check authentication status
  async checkAuth() {
    try {
      if (!supabase) {
        // Demo mode: check localStorage
        const stored = localStorage.getItem('moz_user');
        if (stored) {
          this.currentUser = JSON.parse(stored);
          this.updateUserUI();
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get user profile
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();
        this.currentUser = data || session.user;
        this.updateUserUI();
      }
    } catch (e) {
      console.warn('Auth check failed:', e.message);
    }
  },

  // Update UI based on user state
  updateUserUI() {
    const user = this.currentUser;
    if (!user) return;

    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = user.nome || user.email || 'Aluno';
    });
    document.querySelectorAll('[data-user-email]').forEach(el => {
      el.textContent = user.email || '';
    });
    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      if (user.foto) {
        el.src = user.foto;
      } else {
        // Generate initials avatar
        const name = user.nome || user.email || 'U';
        el.setAttribute('data-initials', name.charAt(0).toUpperCase());
      }
    });

    // Show/hide admin elements
    if (user.tipo === 'admin') {
      document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('[data-student-only]').forEach(el => el.classList.add('hidden'));
    }
  },

  // Setup sidebar toggle for mobile
  setupSidebar() {
    const toggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  },

  // Toast notifications
  setupToast() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  },

  toast(message, type = 'info', duration = 3500) {
    const icons = {
      success: '✓', error: '✕', warning: '⚠', info: 'ℹ'
    };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : ''}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut .3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Show loading overlay
  showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  },
  hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  // Logout
  async logout() {
    try {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem('moz_user');
      this.currentUser = null;
      window.location.href = 'index.html';
    } catch (e) {
      console.error('Logout error:', e);
      window.location.href = 'index.html';
    }
  },

  // Bind global events
  bindGlobalEvents() {
    // Logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', () => this.logout());
    });

    // Protect pages from unauthorized access
    const protectedPages = ['dashboard.html', 'assistir.html', 'perfil.html', 'pagamento.html', 'certificado.html'];
    const adminPages = ['admin.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage) && !this.currentUser) {
      // Give a small delay for async auth check
      setTimeout(() => {
        if (!App.currentUser) {
          window.location.href = 'login.html?redirect=' + currentPage;
        }
      }, 800);
    }

    if (adminPages.includes(currentPage)) {
      setTimeout(() => {
        if (!App.currentUser || App.currentUser.tipo !== 'admin') {
          window.location.href = 'login.html?redirect=admin.html';
        }
      }, 800);
    }
  }
};

// ── Database API Layer ──
const DB = {
  // ── Users ──
  async createUser(nome, email, senha) {
    if (supabase) {
      const { data: auth, error: authErr } = await supabase.auth.signUp({ email, password: senha });
      if (authErr) throw authErr;
      const { data, error } = await supabase.from('usuarios').insert([{
        id: auth.user.id, nome, email, tipo: 'aluno'
      }]).select().single();
      if (error) throw error;
      return data;
    }
    // Demo mode
    const users = JSON.parse(localStorage.getItem('moz_users') || '[]');
    const user = { id: Date.now().toString(), nome, email, senha, tipo: 'aluno', foto: null };
    users.push(user);
    localStorage.setItem('moz_users', JSON.stringify(users));
    return user;
  },

  async loginUser(email, senha) {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      const { data: profile } = await supabase.from('usuarios').select('*').eq('id', data.user.id).single();
      return profile;
    }
    // Demo mode
    const users = JSON.parse(localStorage.getItem('moz_users') || '[]');
    // Admin demo account
    if (email === 'admin@mozacademy.co.mz' && senha === 'Admin@2024') {
      return { id: 'admin-1', nome: 'Administrador', email, tipo: 'admin' };
    }
    const user = users.find(u => u.email === email && u.senha === senha);
    if (!user) throw new Error('Email ou senha incorretos.');
    return user;
  },

  // ── Courses ──
  async getCourses(filters = {}) {
    const demo = this.getDemoCourses();
    if (!supabase) return this.applyFilters(demo, filters);
    let query = supabase.from('cursos').select('*');
    if (filters.categoria) query = query.eq('categoria', filters.categoria);
    if (filters.search) query = query.ilike('titulo', `%${filters.search}%`);
    const { data, error } = await query;
    if (error) return this.applyFilters(demo, filters);
    return data.length ? data : this.applyFilters(demo, filters);
  },

  applyFilters(courses, filters) {
    let result = [...courses];
    if (filters.categoria) result = result.filter(c => c.categoria === filters.categoria);
    if (filters.search) result = result.filter(c => c.titulo.toLowerCase().includes(filters.search.toLowerCase()));
    return result;
  },

  async getCourse(id) {
    const demo = this.getDemoCourses();
    const demoItem = demo.find(c => c.id == id);
    if (!supabase) return demoItem;
    const { data } = await supabase.from('cursos').select('*').eq('id', id).single();
    return data || demoItem;
  },

  async createCourse(courseData) {
    if (supabase) {
      const { data, error } = await supabase.from('cursos').insert([courseData]).select().single();
      if (error) throw error;
      return data;
    }
    const courses = JSON.parse(localStorage.getItem('moz_courses') || '[]');
    const course = { ...courseData, id: Date.now().toString() };
    courses.push(course);
    localStorage.setItem('moz_courses', JSON.stringify(courses));
    return course;
  },

  async updateCourse(id, data) {
    if (supabase) {
      const { data: updated, error } = await supabase.from('cursos').update(data).eq('id', id).select().single();
      if (error) throw error;
      return updated;
    }
  },

  async deleteCourse(id) {
    if (supabase) {
      const { error } = await supabase.from('cursos').delete().eq('id', id);
      if (error) throw error;
    }
  },

  // ── Lessons ──
  async getLessons(courseId) {
    const demoLessons = this.getDemoLessons(courseId);
    if (!supabase) return demoLessons;
    const { data } = await supabase.from('aulas').select('*').eq('curso_id', courseId).order('ordem');
    return (data && data.length) ? data : demoLessons;
  },

  async createLesson(lessonData) {
    if (supabase) {
      const { data, error } = await supabase.from('aulas').insert([lessonData]).select().single();
      if (error) throw error;
      return data;
    }
  },

  // ── Progress ──
  async getProgress(userId, courseId) {
    if (!supabase) {
      const key = `moz_progress_${userId}_${courseId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    const { data } = await supabase.from('progresso').select('*').eq('usuario_id', userId).eq('curso_id', courseId);
    return data || [];
  },

  async markLessonDone(userId, courseId, aulaId) {
    if (!supabase) {
      const key = `moz_progress_${userId}_${courseId}`;
      const progress = JSON.parse(localStorage.getItem(key) || '[]');
      if (!progress.includes(aulaId)) progress.push(aulaId);
      localStorage.setItem(key, JSON.stringify(progress));
      return;
    }
    const { data: existing } = await supabase.from('progresso')
      .select('id').eq('usuario_id', userId).eq('aula_id', aulaId).single();
    if (!existing) {
      await supabase.from('progresso').insert([{
        usuario_id: userId, curso_id: courseId, aula_id: aulaId, concluido: true
      }]);
    }
  },

  // ── Enrollments ──
  async enroll(userId, courseId) {
    if (!supabase) {
      const key = 'moz_enrollments';
      const enrollments = JSON.parse(localStorage.getItem(key) || '[]');
      const exists = enrollments.find(e => e.userId === userId && e.courseId === courseId);
      if (!exists) enrollments.push({ userId, courseId, data: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(enrollments));
      return;
    }
    const { error } = await supabase.from('inscricoes').insert([{ usuario_id: userId, curso_id: courseId }]);
    if (error && error.code !== '23505') throw error; // ignore duplicate
  },

  async isEnrolled(userId, courseId) {
    if (!supabase) {
      const enrollments = JSON.parse(localStorage.getItem('moz_enrollments') || '[]');
      return enrollments.some(e => e.userId === userId && e.courseId === courseId);
    }
    const { data } = await supabase.from('inscricoes').select('id').eq('usuario_id', userId).eq('curso_id', courseId).single();
    return !!data;
  },

  async getUserEnrollments(userId) {
    const ids = [];
    if (!supabase) {
      const enrollments = JSON.parse(localStorage.getItem('moz_enrollments') || '[]');
      const userEnrolled = enrollments.filter(e => e.userId === userId).map(e => e.courseId);
      const courses = this.getDemoCourses();
      return courses.filter(c => userEnrolled.includes(c.id.toString()));
    }
    const { data } = await supabase.from('inscricoes').select('cursos(*)').eq('usuario_id', userId);
    return data ? data.map(d => d.cursos) : [];
  },

  // ── Payments ──
  async createPayment(userId, courseId, valor, metodo) {
    const paymentData = {
      usuario_id: userId, curso_id: courseId, valor, metodo_pagamento: metodo,
      status_pagamento: 'pendente', data: new Date().toISOString()
    };
    if (!supabase) {
      const payments = JSON.parse(localStorage.getItem('moz_payments') || '[]');
      const payment = { ...paymentData, id: Date.now().toString() };
      payments.push(payment);
      localStorage.setItem('moz_payments', JSON.stringify(payments));
      return payment;
    }
    const { data, error } = await supabase.from('pagamentos').insert([paymentData]).select().single();
    if (error) throw error;
    return data;
  },

  async approvePayment(paymentId) {
    if (!supabase) {
      const payments = JSON.parse(localStorage.getItem('moz_payments') || '[]');
      const p = payments.find(p => p.id === paymentId);
      if (p) p.status_pagamento = 'aprovado';
      localStorage.setItem('moz_payments', JSON.stringify(payments));
      return;
    }
    await supabase.from('pagamentos').update({ status_pagamento: 'aprovado' }).eq('id', paymentId);
  },

  async getPayments(userId) {
    if (!supabase) return JSON.parse(localStorage.getItem('moz_payments') || '[]').filter(p => p.usuario_id === userId);
    const { data } = await supabase.from('pagamentos').select('*, cursos(titulo)').eq('usuario_id', userId);
    return data || [];
  },

  async getAllPayments() {
    if (!supabase) return JSON.parse(localStorage.getItem('moz_payments') || '[]');
    const { data } = await supabase.from('pagamentos').select('*, usuarios(nome,email), cursos(titulo)');
    return data || [];
  },

  // ── Certificates ──
  async getCertificate(userId, courseId) {
    if (!supabase) {
      const certs = JSON.parse(localStorage.getItem('moz_certs') || '[]');
      return certs.find(c => c.usuario_id === userId && c.curso_id === courseId);
    }
    const { data } = await supabase.from('certificados').select('*').eq('usuario_id', userId).eq('curso_id', courseId).single();
    return data;
  },

  async createCertificate(userId, courseId) {
    const certData = { usuario_id: userId, curso_id: courseId, data: new Date().toISOString() };
    if (!supabase) {
      const certs = JSON.parse(localStorage.getItem('moz_certs') || '[]');
      const cert = { ...certData, id: Date.now().toString() };
      certs.push(cert);
      localStorage.setItem('moz_certs', JSON.stringify(certs));
      return cert;
    }
    const { data, error } = await supabase.from('certificados').insert([certData]).select().single();
    if (error && error.code !== '23505') throw error;
    return data;
  },

  // ── Users (Admin) ──
  async getAllUsers() {
    if (!supabase) return JSON.parse(localStorage.getItem('moz_users') || '[]');
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // ── Demo Data ──
  getDemoCourses() {
    return [
      {
        id: '1', titulo: 'Desenvolvimento Web Completo', professor: 'Prof. Carlos Nhantumbo',
        categoria: 'Tecnologia', preco: 1500, duracao: '42h', aulas: 86,
        descricao: 'Aprenda HTML, CSS, JavaScript, React e Node.js do zero ao avançado.',
        imagem: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80',
        alunos: 1240, avaliacao: 4.8, nivel: 'Iniciante'
      },
      {
        id: '2', titulo: 'Marketing Digital e Redes Sociais', professor: 'Profa. Fátima Machava',
        categoria: 'Marketing', preco: 1200, duracao: '28h', aulas: 54,
        descricao: 'Estratégias completas de marketing digital para negócios em Moçambique.',
        imagem: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80',
        alunos: 890, avaliacao: 4.7, nivel: 'Todos os níveis'
      },
      {
        id: '3', titulo: 'Excel Avançado para Negócios', professor: 'Prof. António Matsombe',
        categoria: 'Negócios', preco: 800, duracao: '18h', aulas: 36,
        descricao: 'Domine o Excel com fórmulas avançadas, dashboards e Power BI.',
        imagem: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
        alunos: 2100, avaliacao: 4.9, nivel: 'Intermediário'
      },
      {
        id: '4', titulo: 'Design Gráfico com Adobe Photoshop', professor: 'Profa. Rosa Cumbe',
        categoria: 'Design', preco: 1100, duracao: '35h', aulas: 68,
        descricao: 'Crie designs profissionais do zero usando o Photoshop e Illustrator.',
        imagem: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&q=80',
        alunos: 756, avaliacao: 4.6, nivel: 'Iniciante'
      },
      {
        id: '5', titulo: 'Python para Ciência de Dados', professor: 'Prof. João Sitoe',
        categoria: 'Tecnologia', preco: 1800, duracao: '50h', aulas: 95,
        descricao: 'Python, Pandas, NumPy, Machine Learning e visualização de dados.',
        imagem: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80',
        alunos: 543, avaliacao: 4.8, nivel: 'Intermediário'
      },
      {
        id: '6', titulo: 'Inglês para Negócios', professor: 'Profa. Maria Guambe',
        categoria: 'Idiomas', preco: 900, duracao: '24h', aulas: 48,
        descricao: 'Comunicação profissional em inglês para o ambiente corporativo.',
        imagem: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80',
        alunos: 1876, avaliacao: 4.7, nivel: 'Todos os níveis'
      }
    ];
  },

  getDemoLessons(courseId) {
    return [
      { id: '1', curso_id: courseId, titulo: 'Introdução e Configuração do Ambiente', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdf_url: null, duracao: '12:30', ordem: 1, capitulo: 'Módulo 1: Fundamentos' },
      { id: '2', curso_id: courseId, titulo: 'Conceitos Básicos', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdf_url: null, duracao: '18:45', ordem: 2, capitulo: 'Módulo 1: Fundamentos' },
      { id: '3', curso_id: courseId, titulo: 'Primeiros Projetos Práticos', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdf_url: null, duracao: '25:10', ordem: 3, capitulo: 'Módulo 1: Fundamentos' },
      { id: '4', curso_id: courseId, titulo: 'Tópicos Intermediários', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdf_url: null, duracao: '22:00', ordem: 4, capitulo: 'Módulo 2: Intermediário' },
      { id: '5', curso_id: courseId, titulo: 'Projeto Final e Deploy', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdf_url: null, duracao: '35:15', ordem: 5, capitulo: 'Módulo 2: Intermediário' },
    ];
  },

  getDemoUsers() {
    return JSON.parse(localStorage.getItem('moz_users') || '[]');
  }
};

// ── Certificate Generator (jsPDF) ──
const CertGen = {
  generate(userName, courseName, date) {
    if (typeof window.jspdf === 'undefined') {
      App.toast('jsPDF não carregado. Verifique a conexão.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210;

    // Background
    doc.setFillColor(255, 249, 238);
    doc.rect(0, 0, W, H, 'F');

    // Gold border
    doc.setDrawColor(240, 165, 0);
    doc.setLineWidth(3);
    doc.rect(8, 8, W - 16, H - 16);
    doc.setLineWidth(1);
    doc.rect(12, 12, W - 24, H - 24);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(26, 39, 68);
    doc.text('Moz', W / 2 - 12, 42, { align: 'right' });
    doc.setTextColor(240, 165, 0);
    doc.text('Academy', W / 2 - 8, 42, { align: 'left' });

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Plataforma de Educação Online - Moçambique', W / 2, 52, { align: 'center' });

    // Divider
    doc.setDrawColor(240, 165, 0);
    doc.setLineWidth(2);
    doc.line(W / 2 - 40, 58, W / 2 + 40, 58);

    // Body
    doc.setFontSize(13);
    doc.setTextColor(100, 116, 139);
    doc.text('Certificamos que', W / 2, 75, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(26, 39, 68);
    doc.text(userName, W / 2, 92, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text('concluiu com êxito o curso', W / 2, 105, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(224, 148, 0);
    doc.text(courseName, W / 2, 120, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data de conclusão: ${new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, 140, { align: 'center' });

    // Footer line
    doc.setDrawColor(26, 39, 68);
    doc.setLineWidth(1);
    doc.line(60, 165, 140, 165);
    doc.line(160, 165, 240, 165);

    doc.setFontSize(9);
    doc.setTextColor(26, 39, 68);
    doc.setFont('helvetica', 'bold');
    doc.text('Diretor Académico', 100, 172, { align: 'center' });
    doc.text('MozAcademy', 200, 172, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('MozAcademy', 100, 178, { align: 'center' });
    doc.text('www.mozacademy.co.mz', 200, 178, { align: 'center' });

    // Save
    doc.save(`certificado_${courseName.replace(/\s+/g, '_')}.pdf`);
    App.toast('Certificado gerado com sucesso!', 'success');
  }
};

// ── Utility Functions ──
const Utils = {
  formatPrice(price) {
    if (price === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(price);
  },
  formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  },
  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  slugify(text) {
    return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  },
  getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },
  starsHTML(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '<div class="stars">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star ${i <= full ? 'filled' : i === full + 1 && half ? 'half' : ''}">★</span>`;
    }
    html += '</div>';
    return html;
  },
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  },
  avatarHTML(user, size = 40) {
    const initials = this.getInitials(user?.nome || user?.email);
    if (user?.foto) {
      return `<img src="${user.foto}" class="avatar" style="width:${size}px;height:${size}px;" alt="${initials}">`;
    }
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px;background:var(--accent);">${initials}</div>`;
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());

// ── SVG Icons ──
const Icons = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  payment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
};
