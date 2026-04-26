const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PdfService {
    async generatePdf(templateId, data) {
        let browser = null;
        try {
            const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
            const templatesDir = path.join(rootDir, 'templates');
            const masterPath = path.join(templatesDir, 'sfar_master.html');

            if (!fs.existsSync(masterPath)) throw new Error('Plantilla Maestra no encontrada.');
            
            let html = fs.readFileSync(masterPath, 'utf8');

            const ph = (val) => (!val || val.trim() === '') ? 'inline' : 'none';

            const replacements = {
                '{{companyName}}': data.companyName || '',
                '{{activities}}': data.activities || '',
                '{{country}}': data.country || '',
                '{{beneficiaryName}}': data.beneficiaryName || '',
                '{{birthDate}}': data.birthDate || '',
                '{{birthPlace}}': data.birthPlace || '',
                '{{address}}': data.address || '',
                '{{fundsOther}}': data.fundsOther || '',
                '{{custodyName}}': data.custodyName || '',
                '{{custodyPhone}}': data.custodyPhone || '',
                '{{custodyEmail}}': data.custodyEmail || '',
                '{{custodyAddress}}': data.custodyAddress || '',
                '{{signerName}}': data.signerName || '',
                '{{date}}': data.date || '',
                '{{show_companyName}}': ph(data.companyName),
                '{{show_activities}}': ph(data.activities),
                '{{show_country}}': ph(data.country),
                '{{show_beneficiaryName}}': ph(data.beneficiaryName),
                '{{show_birthDate}}': ph(data.birthDate),
                '{{show_birthPlace}}': ph(data.birthPlace),
                '{{show_address}}': ph(data.address),
                '{{show_fundsOther}}': ph(data.fundsOther),
                '{{show_custodyName}}': ph(data.custodyName),
                '{{show_custodyPhone}}': ph(data.custodyPhone),
                '{{show_custodyEmail}}': ph(data.custodyEmail),
                '{{show_custodyAddress}}': ph(data.custodyAddress),
                '{{show_signerName}}': ph(data.signerName),
                '{{show_date}}': ph(data.date),
                '{{check1}}': data.fundsSource?.includes('Bienes personales') ? '✔' : '',
                '{{check2}}': data.fundsSource?.includes('Inversiones Financieras') ? '✔' : '',
                '{{check3}}': data.fundsSource?.includes('Negocios') ? '✔' : '',
                '{{check4}}': data.fundsSource?.includes('Prestamos') ? '✔' : '',
                '{{check5}}': data.fundsSource?.includes('Herencia o Fondo Fiduciario') ? '✔' : ''
            };

            for (const [key, value] of Object.entries(replacements)) {
                html = html.split(key).join(value);
            }

            browser = await puppeteer.launch({ 
                headless: true, 
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--allow-file-access-from-files' // PERMISO TOTAL DE DISCO
                ] 
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });

            return pdfBuffer;
        } catch (error) {
            console.error('❌ FALLO FINAL MOTOR v12:', error.message);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new PdfService();
