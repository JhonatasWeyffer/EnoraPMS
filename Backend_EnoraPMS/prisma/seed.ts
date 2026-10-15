import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const quartos = [
    // =========================================================
    // BLOCO AÇAÍ - 1º ANDAR
    // =========================================================

    // Luxo
    {
      numero: '101',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '103',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '105',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '107',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '109',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '111',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '113',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },
    {
      numero: '115',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Luxo',
    },

    // Superior
    {
      numero: '102',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Superior',
    },
    {
      numero: '104',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Superior',
    },
    {
      numero: '106',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Superior',
    },
    {
      numero: '112',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Superior',
    },

    // PCD / PNE
    {
      numero: 'PNE01',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Superior PCD',
    },
    {
      numero: 'PNE02',
      bloco: 'Açaí',
      andar: 1,
      tipo: 'Superior PCD',
    },


    // =========================================================
    // BLOCO BURITI - 2º ANDAR
    // =========================================================

    // Luxo
    {
      numero: '201',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '203',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '205',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '207',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '209',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '211',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '213',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },
    {
      numero: '215',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Luxo',
    },

    // Superior
    {
      numero: '202',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '204',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '206',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '208',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '210',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '212',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '214',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },
    {
      numero: '216',
      bloco: 'Buriti',
      andar: 2,
      tipo: 'Superior',
    },


    // =========================================================
    // BLOCO CUPUAÇU - 3º ANDAR
    // =========================================================

    // Luxo
    {
      numero: '301',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '303',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '305',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '307',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '309',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '311',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '313',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },
    {
      numero: '315',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Luxo',
    },

    // Superior
    {
      numero: '302',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '304',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '306',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '308',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '310',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '312',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '314',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },
    {
      numero: '316',
      bloco: 'Cupuaçu',
      andar: 3,
      tipo: 'Superior',
    },


    // =========================================================
    // BLOCO MIRITI - 4º ANDAR
    // =========================================================

    // Luxo
    {
      numero: '401',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '403',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '405',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '407',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '409',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '411',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '413',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },
    {
      numero: '415',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Luxo',
    },

    // Superior
    {
      numero: '402',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '404',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '406',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '408',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '410',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '412',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '414',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },
    {
      numero: '416',
      bloco: 'Miriti',
      andar: 4,
      tipo: 'Superior',
    },


    // =========================================================
    // BLOCO PRESIDENCIAL
    // =========================================================

    {
      numero: '01',
      bloco: 'Presidencial',
      andar: 1,
      tipo: 'Suíte Presidencial Golden',
    },
    {
      numero: '02',
      bloco: 'Presidencial',
      andar: 1,
      tipo: 'Suíte Presidencial Platinum',
    },
    {
      numero: '03',
      bloco: 'Presidencial',
      andar: 1,
      tipo: 'Suíte Presidencial Premium',
    },
  ];

  console.log('Iniciando o seed de Quartos...');

  await prisma.quarto.createMany({
    data: quartos,
    skipDuplicates: true,
  });

  console.log(`✅ ${quartos.length} quartos sincronizados com sucesso.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao popular o banco de dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });