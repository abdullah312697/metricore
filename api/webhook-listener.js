import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
const port = 9000;
const execAsync = promisify(exec);

// Read secret from application.json
let secret;
try {
    const config = JSON.parse(fs.readFileSync('/var/www/metricore/config/application.json', 'utf8'));
    secret = config.secret;
    console.log('Secret loaded successfully.');
} catch (error) {
    console.error('Error loading secret:', error);
    process.exit(1);
}

app.use(express.json());

function verifyGitHubSignature(req, res, next) {
    const sig = req.headers['x-hub-signature'] || '';
    const hmac = crypto.createHmac('sha1', secret);
    const digest = 'sha1=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    console.log('Computed digest:', digest);
    console.log('Received signature:', sig);

    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest))) {
        return next();
    } else {
        console.error('Signature verification failed.');
        res.status(403).send('Forbidden');
    }
}

app.post('/hooks/deploy-webhook', verifyGitHubSignature, async (req, res) => {
    try {
        console.log('Received webhook payload:', JSON.stringify(req.body, null, 2));

        const { stdout, stderr } = await execAsync('/var/www/metricore/deploy.sh');
        
        if (stderr) {
            console.error('Error during deployment:', stderr);
            res.status(500).send('Deployment failed');
            return;
        }
        
        console.log('Deployment output:', stdout);
        res.status(200).send('Deployment successful');
    } catch (error) {
        console.error('Error during webhook processing:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Webhook listener running on port ${port}`);
});
