# FLOWFIRE ARENA — validação de modalidades Vortex

Fonte oficial: https://www.vortex-ff.com/docs

## Confirmado na documentação
- POST /rooms cria sala e consome crédito em tokens com saldo.
- Authorization: Bearer TOKEN.
- Payload AP: password (1–16 caracteres), start_delay_minutes (1–10), config_type=ap_padrao, room_name e map_name opcionais.
- GET /rooms/{session_id}/members retorna team e slot, com slots AP 1–8.
- POST /rooms/{session_id}/start inicia a partida.
- GET /rooms/{session_id}/result retorna status, vencedor e kills.
- POST /rooms/{session_id}/release libera a sessão.
- HTTP 422 payload inválido; 429 rate limit; 503 falha operacional.

## Ainda não comprovado
- Limitação nativa da capacidade a 1x1 ou 2x2.
- Garantia de que apenas os jogadores das equipes cadastradas entrarão na sala.
- Política de identificação dos jogadores: verificar se UIDs do cadastro correspondem aos IDs reais da Vortex.
- Segurança da reconciliação quando POST /rooms retorna erro incerto ou timeout.

## Política de liberação
- Manter a criação de salas desabilitada.
- Não efetuar POST /rooms até confirmação explícita para teste com jogadores disponíveis.
- 1x1/2x2: exigir validação prática de slots e bloqueio de jogadores extras, ou orientação oficial do provedor.
- Antes de chamar POST /rooms, conferir aprovação, reserva única e estado da partida em transação.
- Após resposta bem-sucedida, persistir session_id, room_id e senha; se houver resultado ambíguo, sinalizar revisão manual, sem retry automático.
- O endpoint legado /api/admin/vortex-test-room precisa de gate de ambiente antes de qualquer operação real.
