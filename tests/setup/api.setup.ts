import 'reflect-metadata';

process.env.TZ = 'UTC';
process.env.DATABASE_URL ??= 'mysql://root:root@localhost:3307/survey_test';
