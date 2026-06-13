import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PortfolioData {
    total_value_pkr:  number;
    total_cost_pkr:   number;
    total_gain_pkr:   number;
    total_gain_pct:   number;
    pkr_usd_rate:     number;
    holdings:         any[];
}

interface ForecastData {
    p10:                 number;
    p50:                 number;
    p90:                 number;
    annual_return_pct:   number;
    volatility_pct:      number;
    initial_pkr:         number;
    years:               number;
}

interface ESGData {
    portfolio_esg: {
        total_score:       number;
        grade:             string;
        environment_score: number;
        social_score:      number;
        governance_score:  number;
    };
}

interface Goal {
    name:        string;
    target_pkr:  number;
    current_pkr: number;
    deadline:    string;
}

interface TaxOpportunity {
    symbol:              string;
    unrealized_loss_pct: number;
    loss_amount_pkr:     number;
    tax_saved_pkr:       number;
    replacement_symbol:  string;
}

interface PDFData {
    user:          { email: string; name?: string };
    portfolio:     PortfolioData;
    forecast:      ForecastData | null;
    esg:           ESGData | null;
    goals:         Goal[];
    taxLoss:       TaxOpportunity[];
}

// ── Helpers ───────────────────────────────────────────────
const formatPKR = (amount: number): string =>
    `Rs ${Number(amount).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;

const formatPct = (pct: number): string =>
    `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;


export const generateStrategyPDF = (data: PDFData): void => {
    const doc      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW    = doc.internal.pageSize.getWidth();
    const pageH    = doc.internal.pageSize.getHeight();
    const margin   = 15;
    const today    = new Date().toLocaleDateString('en-PK', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    // ── Colours ───────────────────────────────────────────
    const NAVY    = [31,  56,  100] as [number, number, number];
    const GREEN   = [16,  185, 129] as [number, number, number];
    const LGRAY   = [243, 244, 246] as [number, number, number];
    const DGRAY   = [75,  85,  99]  as [number, number, number];
    const WHITE   = [255, 255, 255] as [number, number, number];
    const RED     = [239, 68,  68]  as [number, number, number];

    let y = 0;   // current Y position tracker

    // ════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════════

    // Navy header banner
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 55, 'F');

    // Logo text
    doc.setTextColor(...WHITE);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('FinAI Nexus', margin, 22);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('AI-Powered Robo Financial Advisor', margin, 31);

    // Report title
    doc.setFontSize(11);
    doc.text(`Financial Strategy Report - ${new Date().getFullYear()}`, margin, 42);
    doc.text(`Generated: ${today}`, margin, 50);

    // User info (right side)
    doc.setFontSize(10);
    doc.text(data.user.name || data.user.email, pageW - margin, 38, { align: 'right' });
    doc.text('Platinum Wealth Member', pageW - margin, 45, { align: 'right' });

    y = 70;

    // ── Executive Summary Box ─────────────────────────────
    doc.setFillColor(...LGRAY);
    doc.roundedRect(margin, y, pageW - margin * 2, 45, 3, 3, 'F');

    doc.setTextColor(...NAVY);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin + 5, y + 10);

    // 4 KPI boxes inside summary
    const kpiW   = (pageW - margin * 2 - 20) / 4;
    const kpiX   = [margin + 5, margin + 5 + kpiW + 5, margin + 5 + (kpiW + 5) * 2, margin + 5 + (kpiW + 5) * 3];
    const kpis   = [
        { label: 'Portfolio Value',  value: formatPKR(data.portfolio.total_value_pkr) },
        { label: 'Total Gain',       value: formatPct(data.portfolio.total_gain_pct)  },
        { label: '10Y Forecast P50', value: data.forecast ? formatPKR(data.forecast.p50) : 'N/A' },
        { label: 'ESG Score',        value: data.esg ? `${data.esg.portfolio_esg.total_score}/100` : 'N/A' },
    ];

    kpis.forEach((kpi, i) => {
        doc.setFillColor(...WHITE);
        doc.roundedRect(kpiX[i], y + 16, kpiW, 22, 2, 2, 'F');

        doc.setTextColor(...DGRAY);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, kpiX[i] + kpiW / 2, y + 23, { align: 'center' });

        // Color the value
        const isGain = kpi.label === 'Total Gain';
        const gainPct = data.portfolio.total_gain_pct;
        doc.setTextColor(...(isGain && gainPct < 0 ? RED : GREEN));
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.value, kpiX[i] + kpiW / 2, y + 32, { align: 'center' });
    });

    y += 55;

    // ── Disclaimer ────────────────────────────────────────
    doc.setTextColor(...DGRAY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
        'All portfolio operations are simulated for educational purposes. No real money is involved.',
        pageW / 2, y, { align: 'center' }
    );

    y += 10;

    // ════════════════════════════════════════════════════
    // PAGE 1 — HOLDINGS TABLE
    // ════════════════════════════════════════════════════

    doc.setTextColor(...NAVY);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Current Holdings', margin, y + 8);
    y += 12;

    const holdingRows = data.portfolio.holdings.map(h => [
        h.symbol,
        h.name || h.symbol,
        h.asset_class?.replace('_', ' ') || '-',
        h.quantity?.toFixed(4) || '-',
        formatPKR(h.avg_buy_pkr || h.avg_buy_price || 0),
        formatPKR(h.current_price_pkr || 0),
        formatPKR(h.current_value_pkr || 0),
        formatPct(h.gain_loss_pct || 0),
    ]);

    autoTable(doc, {
        startY:    y,
        head:      [['Symbol', 'Name', 'Class', 'Qty', 'Avg Buy', 'Current', 'Value', 'P&L']],
        body:      holdingRows,
        margin:    { left: margin, right: margin },
        headStyles: {
            fillColor:  NAVY,
            textColor:  WHITE,
            fontSize:   8,
            fontStyle:  'bold',
        },
        bodyStyles: {
            fontSize:   7.5,
            textColor:  [30, 30, 30],
        },
        alternateRowStyles: {
            fillColor: LGRAY,
        },
        columnStyles: {
            7: {   // P&L column — color based on value
                fontStyle: 'bold',
            }
        },
        didParseCell: (hookData) => {
            // Color P&L column green/red
            if (hookData.column.index === 7 && hookData.section === 'body') {
                const val = holdingRows[hookData.row.index]?.[7] || '';
                hookData.cell.styles.textColor = val.startsWith('+')
                    ? GREEN : val.startsWith('-') ? RED : [30, 30, 30];
            }
        },
    });

    // ════════════════════════════════════════════════════
    // PAGE 2 — FORECAST + ESG
    // ════════════════════════════════════════════════════
    doc.addPage();

    // Page header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FinAI Nexus - Financial Strategy Report', margin, 12);
    doc.text(`Page 2`, pageW - margin, 12, { align: 'right' });

    y = 28;

    // ── 10-Year Forecast Section ──────────────────────────
    if (data.forecast) {
        doc.setTextColor(...NAVY);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('10-Year Monte Carlo Forecast', margin, y);
        y += 8;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DGRAY);
        doc.text(
            `Based on ${data.forecast.annual_return_pct?.toFixed(1)}% expected annual return and ${data.forecast.volatility_pct?.toFixed(1)}% volatility across 10,000 simulated paths.`,
            margin, y
        );
        y += 8;

        autoTable(doc, {
            startY: y,
            head:   [['Scenario', 'Percentile', 'Projected Value in 10 Years', 'Growth from Today']],
            body:   [
                ['Conservative', 'P10 (10th percentile)', formatPKR(data.forecast.p10), formatPct(((data.forecast.p10 / data.forecast.initial_pkr) - 1) * 100)],
                ['Median',        'P50 (50th percentile)', formatPKR(data.forecast.p50), formatPct(((data.forecast.p50 / data.forecast.initial_pkr) - 1) * 100)],
                ['Optimistic',    'P90 (90th percentile)', formatPKR(data.forecast.p90), formatPct(((data.forecast.p90 / data.forecast.initial_pkr) - 1) * 100)],
            ],
            margin:     { left: margin, right: margin },
            headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: LGRAY },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ── ESG Section ───────────────────────────────────────
    if (data.esg) {
        doc.setTextColor(...NAVY);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('ESG & Sustainability Score', margin, y);
        y += 8;

        const esg = data.esg.portfolio_esg;

        autoTable(doc, {
            startY: y,
            head:   [['Pillar', 'Score', 'Grade', 'Assessment']],
            body:   [
                ['Overall ESG',  `${esg.total_score}/100`,       esg.grade, esg.total_score >= 70 ? 'Excellent' : esg.total_score >= 55 ? 'Good' : 'Average'],
                ['Environment',  `${esg.environment_score}/100`, esg.grade, 'Carbon footprint and energy usage'],
                ['Social',       `${esg.social_score}/100`,      esg.grade, 'Labour standards and community impact'],
                ['Governance',   `${esg.governance_score}/100`,  esg.grade, 'Board independence and transparency'],
            ],
            margin:     { left: margin, right: margin },
            headStyles: { fillColor: [16, 185, 129], textColor: WHITE, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: LGRAY },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ════════════════════════════════════════════════════
    // PAGE 3 — GOALS + TAX LOSS
    // ════════════════════════════════════════════════════
    doc.addPage();

    // Page header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FinAI Nexus - Financial Strategy Report', margin, 12);
    doc.text('Page 3', pageW - margin, 12, { align: 'right' });

    y = 28;

    // ── Goals Section ─────────────────────────────────────
    if (data.goals.length > 0) {
        doc.setTextColor(...NAVY);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Financial Goals Progress', margin, y);
        y += 8;

        autoTable(doc, {
            startY: y,
            head:   [['Goal', 'Target (PKR)', 'Saved (PKR)', 'Progress', 'Deadline']],
            body:   data.goals.map(g => {
                const progress = ((g.current_pkr / g.target_pkr) * 100).toFixed(1);
                return [
                    g.name,
                    formatPKR(g.target_pkr),
                    formatPKR(g.current_pkr),
                    `${progress}%`,
                    g.deadline
                        ? new Date(g.deadline).toLocaleDateString('en-PK')
                        : 'No deadline',
                ];
            }),
            margin:     { left: margin, right: margin },
            headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: LGRAY },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ── Tax Loss Section ──────────────────────────────────
    doc.setTextColor(...NAVY);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax-Loss Harvesting Opportunities', margin, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DGRAY);
    doc.text('FBR 2024-25 Compliant | 15% Capital Gains Tax Rate', margin, y + 3);
    y += 10;

    if (data.taxLoss.length === 0) {
        doc.setFillColor(...LGRAY);
        doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, 'F');
        doc.setTextColor(...DGRAY);
        doc.setFontSize(9);
        doc.text(
            'No tax-loss harvesting opportunities identified. Portfolio is performing well.',
            pageW / 2, y + 9, { align: 'center' }
        );
        y += 20;
    } else {
        autoTable(doc, {
            startY: y,
            head:   [['Symbol', 'Loss %', 'Unrealized Loss', 'Tax Saving', 'Replacement']],
            body:   data.taxLoss.map(t => [
                t.symbol,
                formatPct(t.unrealized_loss_pct),
                formatPKR(t.loss_amount_pkr),
                formatPKR(t.tax_saved_pkr),
                t.replacement_symbol || '-',
            ]),
            margin:     { left: margin, right: margin },
            headStyles: { fillColor: [239, 68, 68], textColor: WHITE, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: LGRAY },
        });

        y = (doc as any).lastAutoTable.finalY + 8;

        // Total tax saving summary
        const totalTaxSaving = data.taxLoss.reduce((s, t) => s + t.tax_saved_pkr, 0);
        doc.setFillColor(...GREEN);
        doc.roundedRect(margin, y, pageW - margin * 2, 12, 2, 2, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(
            `Total Potential Tax Saving: ${formatPKR(totalTaxSaving)}`,
            pageW / 2, y + 8, { align: 'center' }
        );
    }

    // ════════════════════════════════════════════════════
    // FOOTER ON ALL PAGES
    // ════════════════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...LGRAY);
        doc.rect(0, pageH - 12, pageW, 12, 'F');
        doc.setTextColor(...DGRAY);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
            'FinAI Nexus - AI-Powered Robo Financial Advisor | All operations are simulated',
            pageW / 2, pageH - 5, { align: 'center' }
        );
        doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' });
    }

    // ── Save ──────────────────────────────────────────────
    const filename = `FinAI_Nexus_Strategy_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};
