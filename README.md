hafez360, [30/09/2025 23:06]
# 🤖 AI Artifact Builder

Un ambiente di sviluppo completo potenziato da Claude AI con RAG (Retrieval Augmented Generation) tramite AnythingLLM.

## ✨ Features

- 🎨 Editor Monaco integrato con syntax highlighting
- 📁 File System completo con tree explorer
- 🔄 Live Preview in tempo reale
- 💬 Chat AI con Claude Sonnet 4.5
- 🧠 RAG System per context illimitato
- 💾 Persistenza progetti su database
- 🔍 Vector Search per file rilevanti
- 👥 Multi-progetto support

## 🏗️ Architettura

Frontend (React) ←→ Backend (Node.js) ←→ AnythingLLM ←→ Claude API
                          ↓
                    PostgreSQL + ChromaDB
## 🚀 Quick Start

### Prerequisiti

- Docker & Docker Compose
- Node.js 18+ (per sviluppo locale)
- API Key Anthropic ([ottieni qui](https://console.anthropic.com/))

### Installazione

# Clone repository
git clone https://github.com/tuo-username/ai-artifact-builder.git
cd ai-artifact-builder

# Copia e configura environment variables
cp .env.example .env
# Edita .env con le tue API keys

# Avvia tutti i servizi con Docker
docker-compose up -d

# Attendi che tutti i servizi siano pronti (~2 minuti)
docker-compose logs -f

# Accedi all'applicazione
open http://localhost:3000
### Setup Manuale (Sviluppo)

# Backend
cd backend
npm install
npm run dev

# Frontend (nuovo terminale)
cd frontend
npm install
npm start
## 📦 Servizi

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| Frontend | 3000 | React application |
| Backend API | 4000 | Express server |
| AnythingLLM | 3001 | RAG orchestrator |
| ChromaDB | 8000 | Vector database |
| PostgreSQL | 5432 | Relational database |

## 🔑 Environment Variables

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# AnythingLLM
ANYTHINGLLM_API_KEY=xxxxx
ANYTHINGLLM_URL=http://anythingllm:3001

# Database
DATABASE_URL=postgresql://admin:password@postgres:5432/artifact_builder
DB_PASSWORD=your-secure-password

# Vector DB
CHROMA_URL=http://chromadb:8000

# App
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
## 📖 Utilizzo

### Creare un Nuovo Progetto

1. Clicca su "Nuovo Progetto" nella sidebar
2. Inserisci nome e descrizione
3. Inizia a chattare con l'AI!

### Esempi di Prompt

"Crea un'applicazione React per gestire TODO list con Redux"
"Aggiungi autenticazione JWT al backend"
"Implementa test Jest per tutti i componenti"
"Refactoring del modulo auth seguendo best practices"
"Crea una landing page moderna con animazioni"
### Gestione File

- Generazione: L'AI crea automaticamente file completi
- Editing: Modifica nel Monaco Editor
- Preview: Vedi cambiamenti in tempo reale
- Salvataggio: Auto-save ogni modifica

## 🛠️ Sviluppo

### Struttura Progetto

ai-artifact-builder/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── package.json
│
├── backend/              # Node.js API
│   ├── src/
│   │   ├── routes/       # Express routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Database models
│   │   └── middleware/   # Express middleware
│   └── package.json
│
├── docker-compose.yml    # Docker services
└── docs/                 # Documentation
### Scripts Utili

# Logs di tutti i servizi
docker-compose logs -f

# Rebuild di un servizio specifico
docker-compose up -d --build frontend

# Accesso al database
docker-compose exec postgres psql -U admin -d artifact_builder

# Reset completo
docker-compose down -v
docker-compose up -d
## 🧪 Testing

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
## 📊 Monitoraggio

- Logs: docker-compose logs -f [service]
- Health checks: http://localhost:4000/health
- ChromaDB UI: http://localhost:8000
- AnythingLLM Dashboard: http://localhost:3001

## 🤝 Contributing

1. Fork il progetto
2. Crea un branch (git checkout -b feature/AmazingFeature)
3. Commit le modifiche (git commit -m 'Add AmazingFeature')
4. Push al branch (git push origin feature/AmazingFeature)
5. Apri una Pull Request

## 📝 License

MIT License - vedi [LICENSE](LICENSE) per dettagli

## 🙏 Crediti

- [Anthropic Claude](https://anthropic.com) - AI Model
- [AnythingLLM](https://anythingllm.com) - RAG System
- [ChromaDB](https://www.trychroma.com/) - Vector Database
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code Editor

## 📧 Supporto

- 📖 [Documentazione](./docs)
- 🐛 [Issue Tracker](https://github.com/tuo-username/ai-artifact-builder/issues)
- 💬 [Discussions](https://github.com/tuo-username/ai-artifact-builder/discussions)

## 🗺️ Roadmap

- [ ] Git integration (commit, push, branches)
- [ ] Real-time collaboration
- [ ] AI code review
- [ ] Automatic testing generation
- [ ] Deploy integration (Vercel, Netlify)
- [ ] Package management suggestions
- [ ] Performance monitoring
- [ ] Mobile app

---

Made with ❤️ and Claude AI
