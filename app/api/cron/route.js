import { exec } from 'child_process';

export default function handler(req, res) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  exec('npx prisma db pull', (error, stdout, stderr) => {
    if (error) {
      console.error(`Erreur: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }
    console.log(`Sortie: ${stdout}`);
    return res.status(200).json({ message: 'Commande exécutée avec succès', output: stdout });
  });
}
