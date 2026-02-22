import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Society
  const society = await prisma.society.create({
    data: {
      name: 'Gokuldham Co-operative Housing Society',
      address: 'Powai, Mumbai, Maharashtra 400076',
    },
  });

  // 2. Create Towers
  const towers = ['A', 'B', 'C', 'D'];
  const towerRecords = [];

  for (const tName of towers) {
    const tower = await prisma.tower.create({
      data: {
        name: `Tower ${tName}`,
        societyId: society.id,
      },
    });
    towerRecords.push(tower);
  }

  // 3. Create Flats and Residents
  const indianNames = [
    'Rajesh Kumar', 'Anita Sharma', 'Suresh Patel', 'Priya Singh',
    'Amit Shah', 'Sunita Gupta', 'Vikram Mehta', 'Deepa Iyer',
    'Rohan Deshmukh', 'Kavita Joshi', 'Sanjay Verma', 'Meena Rao',
    'Arjun Nair', 'Pooja Kulkarni', 'Vijay Chauhan', 'Sneha Reddy',
    'Manish Malhotra', 'Ritu Saxena', 'Abhishek Pandey', 'Swati Mishra'
  ];

  const passwordHash = await bcrypt.hash('password123', 10);

  let flatCount = 0;
  for (const tower of towerRecords) {
    for (let floor = 1; floor <= 7; floor++) {
      for (let flatNum = 1; flatNum <= 4; flatNum++) {
        const flatLabel = `${floor}0${flatNum}`;
        const flat = await prisma.flat.create({
          data: {
            towerId: tower.id,
            floorNumber: floor,
            flatNumber: flatLabel,
          },
        });

        // Create a resident for each flat
        const nameIndex = flatCount % indianNames.length;
        const name = indianNames[nameIndex];
        const email = `resident${flatCount + 1}@example.com`;
        
        await prisma.resident.create({
          data: {
            flatId: flat.id,
            fullName: name,
            email: email,
            phone: `98765432${(flatCount + 10).toString().slice(-2)}`,
            passwordHash: passwordHash,
            role: 'RESIDENT',
          },
        });

        flatCount++;
      }
    }
  }

  // 4. Create Admin
  await prisma.resident.create({
    data: {
      flatId: (await prisma.flat.findFirst())!.id, // Just link to first flat for admin demo
      fullName: 'Admin User',
      email: 'admin@society.com',
      phone: '9999999999',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });

  // 5. Create Security
  await prisma.resident.create({
    data: {
      flatId: (await prisma.flat.findFirst({ skip: 1 }))!.id,
      fullName: 'Security Guard',
      email: 'security@society.com',
      phone: '8888888888',
      passwordHash: await bcrypt.hash('security123', 10),
      role: 'SECURITY',
    },
  });

  // 6. Create Maintenance Bills (60% Paid, 40% Unpaid)
  const residents = await prisma.resident.findMany({ where: { role: 'RESIDENT' } });
  const months = ['January', 'February'];
  const year = 2024;

  for (const res of residents) {
    for (const month of months) {
      const isPaid = Math.random() < 0.6;
      const bill = await prisma.maintenanceBill.create({
        data: {
          residentId: res.id,
          month: month,
          year: year,
          amount: 2500,
          status: isPaid ? 'PAID' : 'UNPAID',
        },
      });

      if (isPaid) {
        await prisma.payment.create({
          data: {
            billId: bill.id,
            paymentMode: 'ONLINE',
            transactionId: `TXN${Math.random().toString(36).substring(7).toUpperCase()}`,
          },
        });
      }
    }
  }

  // 7. Create some Complaints
  await prisma.complaint.create({
    data: {
      residentId: residents[0].id,
      title: 'Leaking Pipe',
      description: 'The kitchen pipe is leaking since morning.',
      status: 'PENDING',
    },
  });

  // 8. Create some Notices
  await prisma.notice.create({
    data: {
      title: 'Annual General Meeting',
      description: 'The AGM will be held on Sunday at 10 AM in the clubhouse.',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
