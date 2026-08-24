#!/usr/bin/env python3
"""Gera um PDF-resumo ficticio do case (substitui o PDF real removido).

Uso:
    python3 scripts/gerar_pdf_case.py --out public/Case_Novara_PortoAlegre_Resumo.pdf
"""
import argparse

from fpdf import FPDF

AZUL = (30, 64, 130)
CINZA = (90, 90, 90)


def secao(pdf: FPDF, titulo: str) -> None:
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*AZUL)
    pdf.cell(0, 8, titulo, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(20, 20, 20)


def paragrafo(pdf: FPDF, texto: str, tamanho: int = 10) -> None:
    pdf.set_font("Helvetica", "", tamanho)
    pdf.multi_cell(0, 5.5, texto)
    pdf.ln(1)


def tabela(pdf: FPDF, cabecalho: list[str], linhas: list[list[str]], larguras: list[int]) -> None:
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(230, 235, 245)
    for h, w in zip(cabecalho, larguras):
        pdf.cell(w, 7, h, border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for linha in linhas:
        for cel, w in zip(linha, larguras):
            pdf.cell(w, 6.5, cel, border=1)
        pdf.ln()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*AZUL)
    pdf.cell(0, 12, "Case Novara - Expansão de Operações", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*CINZA)
    pdf.cell(0, 7, "Resumo executivo - recomendação: Porto Alegre (RS)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(20, 20, 20)

    secao(pdf, "Contexto")
    paragrafo(
        pdf,
        "A Novara é uma distribuidora digital B2B de foodservice, com centros de "
        "distribuicao proprios em Curitiba (PR) e Florianopolis (SC). Este case "
        "avalia em qual das 4 cidades candidatas abrir a proxima operacao: "
        "Porto Alegre (RS), Campinas (SP), Goiania (GO) e Uberlandia (MG).",
    )

    secao(pdf, "Metodologia")
    paragrafo(
        pdf,
        "Cinco criterios ponderados, cada um decomposto em subcriterios com fonte "
        "publica (IBGE CEMPRE/SIDRA, PAC, PNAD Continua) ou pesquisa dirigida: "
        "1. Mercado (TAM/SAM/SOM, crescimento, entorno) - 2. Operacao (ticket "
        "provavel, friccao logistica) - 3. Abastecimento do CD - 4. Risco e "
        "concorrencia - 5. Aderencia a estrategia interna.",
    )

    secao(pdf, "Nota final por criterio")
    tabela(
        pdf,
        ["Criterio", "Porto Alegre", "Campinas", "Goiania", "Uberlandia"],
        [
            ["1. Mercado", "4,47", "8,93", "8,42", "0,61"],
            ["2. Operacao", "4,75", "3,32", "7,50", "2,89"],
            ["3. Abastecimento", "5,18", "10,00", "7,89", "0,00"],
            ["4. Risco/Concorrencia", "6,44", "1,00", "2,75", "8,27"],
            ["5. Aderencia Estrategica", "6,00", "1,60", "1,80", "8,80"],
        ],
        [55, 34, 34, 34, 33],
    )

    secao(pdf, "Resultado por cenario de peso")
    tabela(
        pdf,
        ["Cidade", "Base", "Cresc.+Oper.", "Conservador", "Foco Estrategia"],
        [
            ["Porto Alegre (RS)", "5,37", "5,21", "5,50 *", "5,50 *"],
            ["Campinas (SP)", "4,97", "5,45", "4,32", "4,10"],
            ["Goiania (GO)", "5,67 *", "6,24 *", "5,25", "4,72"],
            ["Uberlandia (MG)", "4,11", "3,44", "4,80", "5,30"],
        ],
        [50, 30, 34, 34, 42],
    )

    secao(pdf, "Recomendacao")
    paragrafo(
        pdf,
        "Nenhuma cidade vence em todos os criterios: Goiania domina Mercado, "
        "Operacao e Abastecimento (o lado da oportunidade); Porto Alegre e "
        "Uberlandia dominam Risco e Aderencia (o lado da execucao e da coerencia "
        "estrategica). No cenario Conservador ajustado - que da mais peso a "
        "Risco, o criterio com o haircut mais direto sobre o VPL - Porto Alegre "
        "lidera. Diante da tese publica da Novara de priorizar mercados menores "
        "e menos competitivos antes de escalar, a recomendacao final e Porto "
        "Alegre (RS), mesmo com Goiania numericamente a frente nos cenarios "
        "mais agressivos de crescimento.",
    )

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*CINZA)
    pdf.multi_cell(
        0,
        4.5,
        "Documento ficticio gerado para fins de portfolio. Empresa, cidades-sede, "
        "dados financeiros e resultados sao sinteticos.",
    )

    pdf.output(a.out)
    print(f"escrito {a.out}")


if __name__ == "__main__":
    main()
