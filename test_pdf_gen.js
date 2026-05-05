const { FormData } = require('./server/models');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testGen() {
    try {
        const form = await FormData.findOne({ where: { formType: 'Corporación' }, order: [['createdAt', 'DESC']] });
        if (!form) {
            console.log('No Corporación form found in DB');
            process.exit(0);
        }

        console.log('Testing PDF generation for form ID:', form.id);
        const data = form.data;
        const outputPath = path.join(__dirname, 'test_manual_gen.pdf');
        const scriptPath = path.join(__dirname, 'server/scripts/fill_pdf_expert.py');
        const pythonCommand = 'python';

        const pythonProcess = exec(`${pythonCommand} "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ PYTHON ERROR:', error.message);
                console.error('STDERR:', stderr);
                return;
            }
            console.log('✅ PYTHON STDOUT:', stdout);
            if (fs.existsSync(outputPath)) {
                console.log('🎉 SUCCESS: PDF generated at', outputPath);
            } else {
                console.log('❌ FAILURE: PDF not found');
            }
        });

        pythonProcess.stdin.write(JSON.stringify({ 
            data: data, 
            output_path: outputPath,
            template_name: 'corporacion',
            custom_template_path: path.join(__dirname, 'templates/referencia_maestra.pdf') // Force master for test
        }));
        pythonProcess.stdin.end();

    } catch (err) {
        console.error('DB ERROR:', err.message);
    }
}

testGen();
