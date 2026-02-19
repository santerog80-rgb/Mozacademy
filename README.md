# MozAcademy — Setup Guide

## 🚀 Como Configurar

### 1. Configurar o Supabase

Acesse [supabase.com](https://supabase.com), crie um projeto e execute o SQL abaixo no **SQL Editor**:

```sql
-- ============================================
-- MozAcademy - Estrutura do Banco de Dados
-- ============================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  foto TEXT,
  tipo TEXT DEFAULT 'aluno' CHECK (tipo IN ('aluno', 'admin')),
  telefone TEXT,
  cidade TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Cursos
CREATE TABLE IF NOT EXISTS cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT,
  professor TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco NUMERIC DEFAULT 0,
  duracao TEXT,
  aulas INTEGER DEFAULT 0,
  nivel TEXT DEFAULT 'Todos os níveis',
  alunos INTEGER DEFAULT 0,
  avaliacao NUMERIC DEFAULT 4.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Aulas
CREATE TABLE IF NOT EXISTS aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  video_url TEXT,
  pdf_url TEXT,
  duracao TEXT,
  ordem INTEGER DEFAULT 0,
  capitulo TEXT DEFAULT 'Módulo 1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inscrições
CREATE TABLE IF NOT EXISTS inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, curso_id)
);

-- Progresso
CREATE TABLE IF NOT EXISTS progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE,
  aula_id UUID REFERENCES aulas(id) ON DELETE CASCADE,
  concluido BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  metodo_pagamento TEXT CHECK (metodo_pagamento IN ('mpesa', 'emola', 'mkesh', 'cartao')),
  status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'aprovado', 'rejeitado')),
  data TIMESTAMPTZ DEFAULT NOW()
);

-- Certificados
CREATE TABLE IF NOT EXISTS certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE,
  data TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, curso_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários só veem/editam seus próprios dados
CREATE POLICY "Users can view their own data" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON usuarios FOR UPDATE USING (auth.uid() = id);

-- Cursos: públicos para leitura
CREATE POLICY "Courses are publicly readable" ON cursos FOR SELECT USING (true);
CREATE POLICY "Admins can manage courses" ON cursos FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'admin')
);

-- Aulas: leitura pública
CREATE POLICY "Lessons are publicly readable" ON aulas FOR SELECT USING (true);

-- Inscrições: usuários gerenciam as próprias
CREATE POLICY "Users manage own enrollments" ON inscricoes FOR ALL USING (auth.uid() = usuario_id);

-- Progresso: usuários gerenciam o próprio
CREATE POLICY "Users manage own progress" ON progresso FOR ALL USING (auth.uid() = usuario_id);

-- Pagamentos: usuários veem os próprios
CREATE POLICY "Users view own payments" ON pagamentos FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users create payments" ON pagamentos FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Admins manage payments" ON pagamentos FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'admin')
);

-- Certificados: usuários veem os próprios
CREATE POLICY "Users view own certificates" ON certificados FOR SELECT USING (auth.uid() = usuario_id);

-- ============================================
-- DADOS DE EXEMPLO
-- ============================================

INSERT INTO cursos (titulo, descricao, imagem, professor, categoria, preco, duracao, aulas, nivel, alunos, avaliacao) VALUES
('Desenvolvimento Web Completo', 'Aprenda HTML, CSS, JavaScript, React e Node.js do zero ao avançado.', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600', 'Prof. Carlos Nhantumbo', 'Tecnologia', 1500, '42h', 86, 'Iniciante', 1240, 4.8),
('Marketing Digital e Redes Sociais', 'Estratégias completas de marketing digital para negócios em Moçambique.', 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600', 'Profa. Fátima Machava', 'Marketing', 1200, '28h', 54, 'Todos os níveis', 890, 4.7),
('Excel Avançado para Negócios', 'Domine o Excel com fórmulas avançadas, dashboards e Power BI.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600', 'Prof. António Matsombe', 'Negócios', 800, '18h', 36, 'Intermediário', 2100, 4.9),
('Design Gráfico com Adobe Photoshop', 'Crie designs profissionais do zero usando o Photoshop e Illustrator.', 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=600', 'Profa. Rosa Cumbe', 'Design', 1100, '35h', 68, 'Iniciante', 756, 4.6),
('Python para Ciência de Dados', 'Python, Pandas, NumPy, Machine Learning e visualização de dados.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600', 'Prof. João Sitoe', 'Tecnologia', 1800, '50h', 95, 'Intermediário', 543, 4.8),
('Inglês para Negócios', 'Comunicação profissional em inglês para o ambiente corporativo.', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600', 'Profa. Maria Guambe', 'Idiomas', 900, '24h', 48, 'Todos os níveis', 1876, 4.7);
```

### 2. Configurar Chaves do Supabase

Abra o arquivo `app.js` e substitua:

```javascript
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_CHAVE_ANON';
```

Encontre estas chaves em: **Project Settings > API**

### 3. Conta Admin

Crie uma conta com email `admin@mozacademy.co.mz` e execute no SQL:
```sql
UPDATE usuarios SET tipo = 'admin' WHERE email = 'admin@mozacademy.co.mz';
```

Ou use as credenciais demo:
- **Admin:** admin@mozacademy.co.mz / Admin@2024
- **Aluno:** aluno@demo.mz / Demo@123

---

## 📁 Estrutura de Arquivos

```
/mozacademy
├── index.html       ← Página inicial pública
├── login.html       ← Login (aluno + admin)
├── cadastro.html    ← Registro de alunos
├── dashboard.html   ← Painel do aluno
├── curso.html       ← Detalhes do curso
├── assistir.html    ← Player de vídeo/aulas
├── admin.html       ← Painel administrativo
├── perfil.html      ← Perfil do usuário
├── pagamento.html   ← Checkout de pagamento
├── certificado.html ← Certificado PDF
├── style.css        ← Estilos globais
├── app.js           ← JavaScript + Supabase
└── imagens/
    ├── mpesa.svg
    ├── emola.svg
    ├── mkesh.svg
    └── cartao.svg
```

## 🛠 Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| HTML5/CSS3 | Frontend |
| JavaScript ES6+ | Lógica client-side |
| Supabase | Backend + BD + Auth |
| jsPDF | Geração de certificados PDF |
| Google Fonts | Tipografia (Playfair Display + DM Sans) |

## 💳 Pagamentos

A plataforma está configurada para:
- **M-Pesa** (Vodacom Moçambique)
- **e-Mola** (Movitel)
- **mKesh** (Millennium BIM)
- **Cartões Visa/MasterCard**

Para produção, integre com:
- **M-Pesa API:** https://developer.mpesa.vm.co.mz
- **e-Mola API:** Contactar Movitel
- **Stripe/Paystack** para cartões internacionais

## 🔒 Segurança

- Autenticação via Supabase Auth (JWT)
- Row Level Security (RLS) no banco
- Senhas hasheadas pelo Supabase
- HTTPS obrigatório em produção

## 🌐 Hospedagem Recomendada

- **Netlify** (gratuito, drag & drop)
- **Vercel** (gratuito)
- **Cloudflare Pages** (gratuito, CDN global)

---

*MozAcademy © 2024 — Feito com 🇲🇿 em Moçambique*
