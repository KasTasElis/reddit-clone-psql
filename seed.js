import 'dotenv/config';
import pg from 'pg';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BATCH_SIZE = 1_000;
const USER_COUNT = 1_000;
const CATEGORY_COUNT = 50;
const POST_COUNT = 100_000;
const COMMENT_COUNT = 500_000;
const POST_VOTE_COUNT = 1_000_000;
const COMMENT_VOTE_COUNT = 1_000_000;

function buildInsert(table, columns, rowCount) {
  const colCount = columns.length;
  const placeholders = Array.from({ length: rowCount }, (_, ri) =>
    `(${Array.from({ length: colCount }, (_, ci) => `$${ri * colCount + ci + 1}`).join(', ')})`
  ).join(', ');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
}

async function truncateAll(client) {
  console.log('Truncating tables...');
  await client.query('TRUNCATE TABLE votes, comments, posts, categories, users CASCADE');
  console.log('Tables cleared.');
}

async function seedUsers(client) {
  console.log(`Seeding ${USER_COUNT} users...`);
  const ids = [];
  const columns = ['id', 'username', 'email', 'created_at', 'updated_at'];
  let batch = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const id = randomUUID();
    ids.push(id);
    const createdAt = faker.date.past({ years: 2 });
    batch.push([
      id,
      (faker.internet.username().slice(0, 28) + '_' + i).slice(0, 32),
      faker.internet.email().replace('@', `_${i}@`).slice(0, 64),
      createdAt,
      faker.date.between({ from: createdAt, to: new Date() }),
    ]);

    if (batch.length === BATCH_SIZE || i === USER_COUNT - 1) {
      await client.query(buildInsert('users', columns, batch.length), batch.flat());
      console.log(`  users: ${i + 1}/${USER_COUNT}`);
      batch = [];
    }
  }
  return ids;
}

async function seedCategories(client, userIds) {
  console.log(`Seeding ${CATEGORY_COUNT} categories...`);
  const ids = [];
  const columns = ['id', 'user_id', 'name', 'description', 'created_at', 'updated_at'];
  let batch = [];

  for (let i = 0; i < CATEGORY_COUNT; i++) {
    const id = randomUUID();
    ids.push(id);
    const createdAt = faker.date.past({ years: 2 });
    batch.push([
      id,
      userIds[Math.floor(Math.random() * userIds.length)],
      faker.lorem.words(2).slice(0, 64),
      faker.lorem.sentence(),
      createdAt,
      faker.date.between({ from: createdAt, to: new Date() }),
    ]);

    if (batch.length === BATCH_SIZE || i === CATEGORY_COUNT - 1) {
      await client.query(buildInsert('categories', columns, batch.length), batch.flat());
      console.log(`  categories: ${i + 1}/${CATEGORY_COUNT}`);
      batch = [];
    }
  }
  return ids;
}

async function seedPosts(client, userIds, categoryIds) {
  console.log(`Seeding ${POST_COUNT} posts...`);
  const ids = [];
  const columns = ['id', 'user_id', 'category_id', 'title', 'body', 'created_at', 'updated_at'];
  let batch = [];

  for (let i = 0; i < POST_COUNT; i++) {
    const id = randomUUID();
    ids.push(id);
    const createdAt = faker.date.past({ years: 2 });
    batch.push([
      id,
      userIds[Math.floor(Math.random() * userIds.length)],
      categoryIds[Math.floor(Math.random() * categoryIds.length)],
      faker.lorem.sentence().slice(0, 128),
      faker.lorem.paragraphs(2),
      createdAt,
      faker.date.between({ from: createdAt, to: new Date() }),
    ]);

    if (batch.length === BATCH_SIZE || i === POST_COUNT - 1) {
      await client.query(buildInsert('posts', columns, batch.length), batch.flat());
      if ((i + 1) % 10_000 === 0 || i === POST_COUNT - 1) {
        console.log(`  posts: ${i + 1}/${POST_COUNT}`);
      }
      batch = [];
    }
  }
  return ids;
}

async function seedComments(client, userIds, postIds) {
  console.log(`Seeding ${COMMENT_COUNT} comments...`);
  const insertedIds = [];
  let pendingIds = [];
  const columns = ['id', 'user_id', 'post_id', 'parent_id', 'body', 'created_at', 'updated_at'];
  let batch = [];

  for (let i = 0; i < COMMENT_COUNT; i++) {
    const id = randomUUID();
    pendingIds.push(id);

    const isReply = insertedIds.length > 0 && Math.random() < 0.4;
    const parentId = isReply
      ? insertedIds[Math.floor(Math.random() * insertedIds.length)]
      : null;

    const createdAt = faker.date.past({ years: 2 });
    batch.push([
      id,
      userIds[Math.floor(Math.random() * userIds.length)],
      postIds[Math.floor(Math.random() * postIds.length)],
      parentId,
      faker.lorem.paragraph(),
      createdAt,
      faker.date.between({ from: createdAt, to: new Date() }),
    ]);

    if (batch.length === BATCH_SIZE || i === COMMENT_COUNT - 1) {
      await client.query(buildInsert('comments', columns, batch.length), batch.flat());
      for (const pid of pendingIds) insertedIds.push(pid);
      pendingIds = [];
      batch = [];
      if ((i + 1) % 50_000 === 0 || i === COMMENT_COUNT - 1) {
        console.log(`  comments: ${i + 1}/${COMMENT_COUNT}`);
      }
    }
  }
  return insertedIds;
}

async function seedVotes(client, userIds, postIds, commentIds) {
  console.log(`Seeding ${POST_VOTE_COUNT + COMMENT_VOTE_COUNT} votes...`);
  const votedPost = new Set();
  const votedComment = new Set();
  const columns = ['id', 'user_id', 'post_id', 'comment_id', 'value', 'created_at'];
  let batch = [];

  for (let i = 0; i < POST_VOTE_COUNT; i++) {
    let ui, pi;
    do {
      ui = Math.floor(Math.random() * userIds.length);
      pi = Math.floor(Math.random() * postIds.length);
    } while (votedPost.has(`${ui}:${pi}`));
    votedPost.add(`${ui}:${pi}`);

    batch.push([
      randomUUID(),
      userIds[ui],
      postIds[pi],
      null,
      Math.random() < 0.5 ? 1 : -1,
      faker.date.past({ years: 2 }),
    ]);

    if (batch.length === BATCH_SIZE || i === POST_VOTE_COUNT - 1) {
      await client.query(buildInsert('votes', columns, batch.length), batch.flat());
      batch = [];
      if ((i + 1) % 100_000 === 0 || i === POST_VOTE_COUNT - 1) {
        console.log(`  post votes: ${i + 1}/${POST_VOTE_COUNT}`);
      }
    }
  }

  for (let i = 0; i < COMMENT_VOTE_COUNT; i++) {
    let ui, ci;
    do {
      ui = Math.floor(Math.random() * userIds.length);
      ci = Math.floor(Math.random() * commentIds.length);
    } while (votedComment.has(`${ui}:${ci}`));
    votedComment.add(`${ui}:${ci}`);

    batch.push([
      randomUUID(),
      userIds[ui],
      null,
      commentIds[ci],
      Math.random() < 0.5 ? 1 : -1,
      faker.date.past({ years: 2 }),
    ]);

    if (batch.length === BATCH_SIZE || i === COMMENT_VOTE_COUNT - 1) {
      await client.query(buildInsert('votes', columns, batch.length), batch.flat());
      batch = [];
      if ((i + 1) % 100_000 === 0 || i === COMMENT_VOTE_COUNT - 1) {
        console.log(`  comment votes: ${i + 1}/${COMMENT_VOTE_COUNT}`);
      }
    }
  }
}

async function main() {
  const start = Date.now();
  const client = await pool.connect();
  try {
    await truncateAll(client);
    const userIds = await seedUsers(client);
    const categoryIds = await seedCategories(client, userIds);
    const postIds = await seedPosts(client, userIds, categoryIds);
    const commentIds = await seedComments(client, userIds, postIds);
    await seedVotes(client, userIds, postIds, commentIds);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nDone in ${elapsed}s`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
