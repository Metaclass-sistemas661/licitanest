#!/bin/bash
# =============================================================================
# LICITANEST — Script para aplicar schema no Google Cloud SQL
# =============================================================================
# USO (Cloud Shell ou máquina com gcloud configurado):
#
#   1. Via Cloud SQL Proxy (recomendado para produção):
#      cloud-sql-proxy INSTANCE_NAME &
#      ./aplicar.sh
#
#   2. Via gcloud diretamente:
#      gcloud sql connect INSTANCE_NAME --user=postgres --database=licitanest < aplicar.sql
#
#   3. Aplicar arquivo individual:
#      ./aplicar.sh --arquivo 22_rls_multitenant.sql
#
# VARIÁVEIS DE AMBIENTE:
#   DB_HOST     - Host do banco (default: 127.0.0.1)
#   DB_PORT     - Porta (default: 5432)
#   DB_NAME     - Nome do banco (default: licitanest)
#   DB_USER     - Usuário (default: postgres)
#   PGPASSWORD  - Senha do banco (obrigatório)
# =============================================================================

set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-licitanest}"
DB_USER="${DB_USER:-postgres}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ordem de execução (respeitando dependências de FK)
ARQUIVOS=(
    "01_extensoes.sql"
    "02_usuarios.sql"
    "03_municipios_acesso.sql"
    "04_audit_log.sql"
    "05_catalogo.sql"
    "06_fornecedores.sql"
    "07_fontes_crawlers.sql"
    "08_cestas.sql"
    "09_indices.sql"
    "10_cotacoes.sql"
    "11_atividades.sql"
    "12_relatorios.sql"
    "13_billing.sql"
    "14_comunicacao.sql"
    "15_api_externa.sql"
    "16_workflow_lgpd.sql"
    "17_importacoes_ia.sql"
    "18_infraestrutura.sql"
    "19_funcoes.sql"
    "20_views.sql"
    "21_triggers.sql"
    "22_rls_multitenant.sql"
    "23_seed.sql"
    "24_fontes_fase7.sql"
    "25_fontes_fase7_p1.sql"
    "26_fontes_fase7_p2p3.sql"
    "27_otimizacao_fase8.sql"
    "28_jsonb_validacao.sql"
    "29_soft_delete_constraints.sql"
    "30_alinhar_producao.sql"
)

executar_sql() {
    local arquivo="$1"
    local caminho="${SCRIPT_DIR}/${arquivo}"

    if [ ! -f "$caminho" ]; then
        echo -e "${RED}✗ Arquivo não encontrado: ${arquivo}${NC}"
        return 1
    fi

    echo -ne "  Aplicando ${arquivo}... "
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -f "$caminho" -v ON_ERROR_STOP=1 --quiet 2>/tmp/licitanest_sql_err.log; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ ERRO${NC}"
        cat /tmp/licitanest_sql_err.log
        return 1
    fi
}

# Modo arquivo individual
if [ "${1:-}" = "--arquivo" ] && [ -n "${2:-}" ]; then
    echo -e "${YELLOW}═══ LicitaNest — Aplicando arquivo individual ═══${NC}"
    echo -e "Banco: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo ""
    executar_sql "$2"
    echo -e "\n${GREEN}═══ Concluído ═══${NC}"
    exit 0
fi

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  LicitaNest — Aplicação do Schema Completo${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "Banco: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo -e "Arquivos: ${#ARQUIVOS[@]}"
echo ""

if [ -z "${PGPASSWORD:-}" ]; then
    echo -e "${RED}ERRO: variável PGPASSWORD não definida.${NC}"
    echo "  export PGPASSWORD='sua-senha-aqui'"
    exit 1
fi

# Verificar conectividade
echo -ne "Testando conexão... "
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -c "SELECT 1;" --quiet 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FALHOU${NC}"
    echo "Verifique Cloud SQL Proxy, credenciais e rede."
    exit 1
fi

echo ""
echo "Iniciando aplicação em ordem..."
echo ""

TOTAL=0
SUCESSO=0
FALHA=0

for arquivo in "${ARQUIVOS[@]}"; do
    TOTAL=$((TOTAL + 1))
    if executar_sql "$arquivo"; then
        SUCESSO=$((SUCESSO + 1))
    else
        FALHA=$((FALHA + 1))
        echo -e "${RED}Abortando por erro em ${arquivo}${NC}"
        break
    fi
done

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "  Total: ${TOTAL} | ${GREEN}Sucesso: ${SUCESSO}${NC} | ${RED}Falha: ${FALHA}${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

if [ "$FALHA" -eq 0 ]; then
    echo -e "\n${GREEN}✅ Schema aplicado com sucesso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "  1. Criar usuário da aplicação: CREATE USER app LOGIN PASSWORD '...';"
    echo "  2. Atribuir role: GRANT app_user TO app;"
    echo "  3. Configurar conexão na API com esse usuário"
    echo "  4. Verificar RLS: SET LOCAL app.current_municipio_id = '<uuid>';"
else
    echo -e "\n${RED}❌ Schema aplicado parcialmente. Corrija o erro e re-execute.${NC}"
    exit 1
fi
