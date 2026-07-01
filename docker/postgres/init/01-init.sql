-- PostgreSQL initialization script
-- Runs once when the container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application database (if using separate DB)
-- CREATE DATABASE platform_app;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS scheduler;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS metadata;

-- Create read-only role for reporting
CREATE ROLE IF NOT EXISTS platform_reader;
GRANT CONNECT ON DATABASE platform TO platform_reader;
GRANT USAGE ON SCHEMA public TO platform_reader;

-- Note: Full schema will be managed by Prisma migrations
-- This file handles OS-level config only
