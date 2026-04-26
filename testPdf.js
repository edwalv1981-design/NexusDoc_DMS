const pdfService = require('./server/services/pdfService');

async function test() {
    try {
        const formData = {
            companyName: 'Test Company',
            activities: 'Test Activities',
            country: 'Test Country',
            beneficiaryName: 'Test Beneficiary',
            birthDate: '1990-01-01',
            birthPlace: 'Test Place',
            address: 'Test Address',
            fundsSource: ['Negocios'],
            fundsOther: '',
            custodyName: 'Test Custody',
            custodyPhone: '1234567890',
            custodyEmail: 'test@test.com',
            custodyAddress: 'Test Custody Address',
            signerName: 'Test Signer',
            date: '2026-04-24'
        };
        console.log('Generating PDF...');
        const buffer = await pdfService.generateSfarPdf(formData);
        console.log('PDF generated successfully. Buffer size:', buffer.length);
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

test();
