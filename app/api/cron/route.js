import { exec } from 'child_process';

export async function GET(req) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Promise((resolve, reject) => {
    exec('npx prisma db pull', (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur: ${error.message}`);
        return reject(new Response(error.message, { status: 500 }));
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return reject(new Response(stderr, { status: 500 }));
      }
      console.log(`Sortie: ${stdout}`);
      return resolve(new Response(JSON.stringify({ message: 'Commande exécutée avec succès', output: stdout }), { status: 200 }));
    });
  });
}
