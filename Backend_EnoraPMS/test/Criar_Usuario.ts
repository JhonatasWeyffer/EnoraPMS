// ===== Script para criação dos usuários no Sistema =====
import { PrismaClient, Perfil } from '@prisma/client'; 
import * as argon2 from 'argon2'; 

const prisma = new PrismaClient();

async function main() {
  // Hash da senha
  const senha = "super123";
  const senhaHash = await argon2.hash(senha); 

  try {
    const user = await prisma.usuario.create({
      data: {
        nome: "Super Usuario",            
        email: "super.usuario@enorapms.com.br",
        cpf: "035.846.102-22", // 👈 Adicionado aqui (ajuste para um CPF válido se necessário)
        senhaHash,
        perfil: Perfil.ADMINISTRADOR                
      }
    });
    
    console.log(`✅ Usuário ${user.nome} do E-mail ${user.email} da senha ${senha} criado com sucesso!`);
  } catch (error: unknown) {
    const mensagem = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao criar usuário (verifique se o e-mail ou CPF já existem):", mensagem);
  } finally {
    await prisma.$disconnect();
  }
}

main();