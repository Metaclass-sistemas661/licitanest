import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link2,
  Minus,
  Undo2,
  Redo2,
  Table,
  Image,
  Palette,
  Type,
  ChevronDown,
  Variable,
  FileText,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface ContratoToolbarProps {
  editor: Editor | null;
}

const FONT_FAMILIES = [
  { label: "Padrão", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const TEXT_COLORS = [
  "#000000", "#374151", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#2563eb", "#7c3aed", "#db2777", "#64748b",
];

const TEMPLATE_VARIABLES = [
  { label: "Nome do Município", value: "{{municipio_nome}}" },
  { label: "UF", value: "{{municipio_uf}}" },
  { label: "CNPJ Município", value: "{{municipio_cnpj}}" },
  { label: "Valor Total", value: "{{valor_total}}" },
  { label: "Valor por Extenso", value: "{{valor_extenso}}" },
  { label: "Valor Mensal", value: "{{valor_mensal}}" },
  { label: "Data Início", value: "{{data_inicio}}" },
  { label: "Data Fim", value: "{{data_fim}}" },
  { label: "Data Assinatura", value: "{{data_assinatura}}" },
  { label: "Nº Contrato", value: "{{numero_contrato}}" },
  { label: "Nº Processo", value: "{{numero_processo}}" },
  { label: "Modalidade", value: "{{modalidade}}" },
  { label: "Responsável Nome", value: "{{responsavel_nome}}" },
  { label: "Responsável CPF", value: "{{responsavel_cpf}}" },
  { label: "Responsável Cargo", value: "{{responsavel_cargo}}" },
  { label: "Data Atual", value: "{{data_atual}}" },
  { label: "Ano Atual", value: "{{ano_atual}}" },
];

const TEMPLATES = [
  {
    label: "Contrato de Licença de Software SaaS",
    content: `<h1 style="text-align: center">CONTRATO DE LICENÇA DE USO DE SOFTWARE SAAS</h1>
<h2 style="text-align: center">Nº {{numero_contrato}}</h2>
<p style="text-align: center"><strong>Processo nº {{numero_processo}} — {{modalidade}}</strong></p>
<hr>
<p>Pelo presente instrumento, de um lado a <strong>LICITANEST TECNOLOGIA LTDA</strong>, inscrita no CNPJ/MF sob o nº XX.XXX.XXX/0001-XX, doravante denominada <strong>CONTRATADA</strong>, e de outro lado o <strong>MUNICÍPIO DE {{municipio_nome}} — {{municipio_uf}}</strong>, inscrito no CNPJ/MF sob o nº {{municipio_cnpj}}, neste ato representado pelo(a) Sr(a). <strong>{{responsavel_nome}}</strong>, portador(a) do CPF nº {{responsavel_cpf}}, ocupante do cargo de <strong>{{responsavel_cargo}}</strong>, doravante denominado <strong>CONTRATANTE</strong>, ficam ajustadas as seguintes cláusulas:</p>

<h2>CLÁUSULA PRIMEIRA — DO OBJETO</h2>
<p>O presente contrato tem por objeto a licença de uso do sistema <strong>LicitaNest</strong>, plataforma SaaS de gestão de pesquisa de preços e licitações, conforme especificações do Termo de Referência anexo.</p>

<h2>CLÁUSULA SEGUNDA — DO VALOR</h2>
<p>O valor total do presente contrato é de <strong>{{valor_total}}</strong> ({{valor_extenso}}), com parcelas mensais de <strong>{{valor_mensal}}</strong>.</p>

<h2>CLÁUSULA TERCEIRA — DA VIGÊNCIA</h2>
<p>O presente contrato terá vigência de <strong>{{data_inicio}}</strong> a <strong>{{data_fim}}</strong>, podendo ser prorrogado nos termos da legislação vigente.</p>

<h2>CLÁUSULA QUARTA — DAS OBRIGAÇÕES DA CONTRATADA</h2>
<ul>
  <li>Disponibilizar acesso ao sistema LicitaNest em ambiente web seguro (HTTPS)</li>
  <li>Garantir disponibilidade mínima de 99,5% (SLA)</li>
  <li>Realizar manutenções preventivas e corretivas</li>
  <li>Fornecer suporte técnico em dias úteis, das 8h às 18h</li>
  <li>Realizar backup diário dos dados</li>
  <li>Manter conformidade com a LGPD</li>
</ul>

<h2>CLÁUSULA QUINTA — DAS OBRIGAÇÕES DO CONTRATANTE</h2>
<ul>
  <li>Efetuar os pagamentos nas datas de vencimento</li>
  <li>Designar servidor responsável pela gestão do contrato</li>
  <li>Não compartilhar credenciais de acesso</li>
  <li>Utilizar o sistema conforme os termos de uso</li>
</ul>

<h2>CLÁUSULA SEXTA — DO PAGAMENTO</h2>
<p>O pagamento será efetuado mensalmente, até o 10º dia útil do mês subsequente à prestação do serviço, mediante apresentação de nota fiscal.</p>

<h2>CLÁUSULA SÉTIMA — DA RESCISÃO</h2>
<p>O contrato poderá ser rescindido nas hipóteses previstas nos artigos 137 a 139 da Lei nº 14.133/2021.</p>

<h2>CLÁUSULA OITAVA — DO FORO</h2>
<p>Fica eleito o foro da Comarca de {{municipio_nome}} — {{municipio_uf}} para dirimir quaisquer questões oriundas do presente contrato.</p>

<p style="text-align: center; margin-top: 48px">{{municipio_nome}} — {{municipio_uf}}, {{data_assinatura}}</p>

<table style="width: 100%; margin-top: 48px">
  <tr>
    <td style="text-align: center; width: 50%; padding: 24px">
      <p>_________________________________</p>
      <p><strong>CONTRATADA</strong></p>
      <p>LICITANEST TECNOLOGIA LTDA</p>
    </td>
    <td style="text-align: center; width: 50%; padding: 24px">
      <p>_________________________________</p>
      <p><strong>CONTRATANTE</strong></p>
      <p>{{responsavel_nome}}</p>
      <p>{{responsavel_cargo}}</p>
    </td>
  </tr>
</table>`,
  },
  {
    label: "Termo Aditivo de Prazo",
    content: `<h1 style="text-align: center">TERMO ADITIVO DE PRAZO</h1>
<h2 style="text-align: center">Ao Contrato nº {{numero_contrato}}</h2>
<hr>
<p>Pelo presente instrumento, as partes acima qualificadas no contrato original nº {{numero_contrato}}, firmado em {{data_assinatura}}, resolvem aditar o referido instrumento para <strong>prorrogar o prazo de vigência</strong>, nos termos que se seguem:</p>

<h2>CLÁUSULA PRIMEIRA — DA PRORROGAÇÃO</h2>
<p>Fica prorrogada a vigência do contrato por mais 12 (doze) meses, com novo término em <strong>{{data_fim}}</strong>.</p>

<h2>CLÁUSULA SEGUNDA — DA RATIFICAÇÃO</h2>
<p>Ficam ratificadas todas as demais cláusulas e condições do contrato original, não alteradas por este termo.</p>

<p style="text-align: center; margin-top: 48px">{{municipio_nome}} — {{municipio_uf}}, {{data_atual}}</p>`,
  },
  {
    label: "Termo Aditivo de Valor",
    content: `<h1 style="text-align: center">TERMO ADITIVO DE VALOR</h1>
<h2 style="text-align: center">Ao Contrato nº {{numero_contrato}}</h2>
<hr>
<p>Pelo presente instrumento, as partes acima qualificadas no contrato original nº {{numero_contrato}}, resolvem aditar o referido instrumento para <strong>reajustar o valor contratual</strong>, nos termos que se seguem:</p>

<h2>CLÁUSULA PRIMEIRA — DO REAJUSTE</h2>
<p>O valor total do contrato passa a ser de <strong>{{valor_total}}</strong> ({{valor_extenso}}), com parcelas mensais de <strong>{{valor_mensal}}</strong>.</p>

<h2>CLÁUSULA SEGUNDA — DA JUSTIFICATIVA</h2>
<p>O reajuste fundamenta-se no índice acumulado do IPCA no período, conforme demonstrativo em anexo.</p>

<h2>CLÁUSULA TERCEIRA — DA RATIFICAÇÃO</h2>
<p>Ficam ratificadas todas as demais cláusulas e condições do contrato original, não alteradas por este termo.</p>

<p style="text-align: center; margin-top: 48px">{{municipio_nome}} — {{municipio_uf}}, {{data_atual}}</p>`,
  },
];

/* ── Dropdown genérico ────────────────────────────────────────────── */

function Dropdown({
  trigger,
  children,
  align = "left",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-muted transition-colors"
      >
        {trigger}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 z-50 min-w-45 max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg py-1 ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors
        ${active ? "bg-superadmin-accent/20 text-superadmin-accent" : "hover:bg-muted text-foreground/70 hover:text-foreground"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

export function ContratoToolbar({ editor }: ContratoToolbarProps) {
  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL do link:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL da imagem:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-b bg-muted/30 px-2 py-1.5">
      {/* Undo / Redo */}
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer (Ctrl+Z)" disabled={!editor.can().undo()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer (Ctrl+Y)" disabled={!editor.can().redo()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Font Family */}
      <Dropdown trigger={<><Type className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Fonte</span></>}>
        {FONT_FAMILIES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => f.value ? editor.chain().focus().setFontFamily(f.value).run() : editor.chain().focus().unsetFontFamily().run()}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
            style={{ fontFamily: f.value || undefined }}
          >
            {f.label}
          </button>
        ))}
      </Dropdown>

      {/* Font Size – implemented via text style */}
      <Dropdown trigger={<span className="text-xs font-medium">Tamanho</span>}>
        {FONT_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => editor.chain().focus().setMark("textStyle", { fontSize: s }).run()}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
          >
            {s}
          </button>
        ))}
      </Dropdown>

      <Divider />

      {/* Basic formatting */}
      <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Realçar">
        <Highlighter className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Headings */}
      <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1">
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título 3">
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Lists */}
      <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Alignment */}
      <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinhar à esquerda">
        <AlignLeft className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centralizar">
        <AlignCenter className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinhar à direita">
        <AlignRight className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justificar">
        <AlignJustify className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Text color */}
      <Dropdown trigger={<Palette className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-5 gap-1 p-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => editor.chain().focus().setColor(c).run()}
              className="h-6 w-6 rounded border hover:scale-110 transition-transform"
              title={c}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors border-t"
        >
          Remover cor
        </button>
      </Dropdown>

      {/* Table */}
      <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()} title="Inserir tabela">
        <Table className="h-4 w-4" />
      </ToolbarBtn>

      {/* Image */}
      <ToolbarBtn onClick={addImage} title="Inserir imagem">
        <Image className="h-4 w-4" />
      </ToolbarBtn>

      {/* Link */}
      <ToolbarBtn active={editor.isActive("link")} onClick={addLink} title="Inserir link (Ctrl+K)">
        <Link2 className="h-4 w-4" />
      </ToolbarBtn>

      {/* Horizontal rule */}
      <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separador">
        <Minus className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Template variables */}
      <Dropdown trigger={<><Variable className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Variáveis</span></>} align="right">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => editor.chain().focus().insertContent(v.value).run()}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
          >
            <span className="font-medium">{v.label}</span>
            <span className="ml-2 text-muted-foreground font-mono text-[10px]">{v.value}</span>
          </button>
        ))}
      </Dropdown>

      {/* Templates */}
      <Dropdown trigger={<><FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Templates</span></>} align="right">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => editor.chain().focus().setContent(t.content).run()}
            className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
          >
            {t.label}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}
