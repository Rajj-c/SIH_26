import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSupabaseUrl } from '../lib/supabase/project-url.mjs';

test('REST endpoint configuration routes OAuth through Auth instead of PostgREST', () => {
  for (const value of ['https://example.supabase.co/rest/v1', ' https://example.supabase.co/rest/v1/ ']) {
    assert.equal(`${normalizeSupabaseUrl(value)}/auth/v1/authorize`, 'https://example.supabase.co/auth/v1/authorize');
    assert.equal(`${normalizeSupabaseUrl(value)}/rest/v1`, 'https://example.supabase.co/rest/v1');
  }
});

test('project URLs, local development and proxy prefixes remain supported', () => {
  assert.equal(normalizeSupabaseUrl('https://example.supabase.co/'), 'https://example.supabase.co');
  assert.equal(normalizeSupabaseUrl('http://127.0.0.1:54321'), 'http://127.0.0.1:54321');
  assert.equal(normalizeSupabaseUrl('https://example.com/supabase/rest/v1/'), 'https://example.com/supabase');
});

test('invalid or credential-bearing project URLs fail before a request', () => {
  for (const value of ['', 'invalid', 'file:///etc', 'https://user:secret@example.com', 'https://example.com?apikey=secret', 'https://example.com#fragment']) {
    assert.throws(() => normalizeSupabaseUrl(value));
  }
});
