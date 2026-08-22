--
-- PostgreSQL database dump
--

\restrict 1YmUH2bcmBLUSiElkg9JUDnDuL6GRDCduuHC6ORHamr4OPUsAU7FHNu2Q5cjZFc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) VALUES ('avatars', 'avatars', NULL, '2026-08-22 08:55:19.799787+00', '2026-08-22 08:55:19.799787+00', true, false, NULL, NULL, NULL, 'STANDARD');
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) VALUES ('event-posters', 'event-posters', NULL, '2026-08-22 08:55:19.843888+00', '2026-08-22 08:55:19.843888+00', true, false, 5242880, '{image/jpeg,image/png,image/webp}', NULL, 'STANDARD');
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) VALUES ('chat-images', 'chat-images', NULL, '2026-08-22 08:55:20.06537+00', '2026-08-22 08:55:20.06537+00', false, false, 10485760, '{image/jpeg,image/png,image/webp,image/gif}', NULL, 'STANDARD');


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- PostgreSQL database dump complete
--

\unrestrict 1YmUH2bcmBLUSiElkg9JUDnDuL6GRDCduuHC6ORHamr4OPUsAU7FHNu2Q5cjZFc
