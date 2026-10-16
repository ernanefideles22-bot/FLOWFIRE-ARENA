# FLOWFIRE ARENA — roteiro seguro
1. Modalidades pretendidas: CS 1v1, 2v2 e 4v4. A compatibilidade real com Vortex está pendente de testes com jogadores.
2. Pré-cadastro visual: sem dados persistidos. Não anunciar inscrições confirmadas até existir banco e backend.
3. Próximo backend: PostgreSQL com equipes, jogadores, partidas, sessões Vortex e histórico de status; validação server-side e autenticação.
4. Pareamento: só equipes da mesma modalidade; impedir inscrição duplicada, concorrência e partidas simultâneas indevidas.
5. Criação de sala: endpoint autenticado no servidor, com idempotência e rate limit; nunca expor VORTEX_TOKEN ao navegador.
6. Início e resultados: somente após confirmação da API e testes; guardar resultados imediatamente, pois podem expirar.
7. Pagamentos e prêmios: desativados até análise regulatória, antifraude e financeira.
8. Testes de amanhã: iniciar 1v1, 2v2 e 4v4 com salas AP e validar posição de equipes, início e winner_team.
