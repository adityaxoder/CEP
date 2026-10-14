import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';

afterEach(() => {
  cleanup();
});

async function enterWorkspace(user) {
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Login' }));
}

async function submitText(user, text) {
  const textInput = screen.getByLabelText('Text message');
  await user.clear(textInput);
  fireEvent.change(textInput, { target: { value: text } });
  const consent = screen.getByRole('checkbox', { name: 'I understand.' });
  if (!consent.checked) await user.click(consent);
  const submitButton = screen.getByRole('button', { name: /Analyse text/i });
  expect(textInput).toHaveValue(text);
  expect(consent).toBeChecked();
  expect(submitButton).toBeEnabled();
  await user.click(submitButton);
}

describe('application workflows', () => {
  it('allows the local login and signup demo flows', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create demo account/i }));
    expect(await screen.findByRole('heading', { name: 'Text analysis' })).toBeInTheDocument();
  });

  it('gates submission until input and consent are present', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);

    const submitButton = screen.getByRole('button', { name: /Analyse text/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText('Text message'), 'Thanks for your help.');
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'I understand.' }));
    expect(submitButton).toBeEnabled();
  });

  it('adds successful runs to history and clears them', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);
    await submitText(user, 'Thanks for your help.');

    expect(await screen.findByRole('heading', { name: 'Analysis results' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText('1 run this session')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear session history' }));
    expect(await screen.findByText('No analyses yet this session')).toBeInTheDocument();
  });

  it('supports the mock failure, retry, and later success without saving the failure', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);
    await submitText(user, '[error] demo failure');

    expect(await screen.findByText('Analysis failed', {}, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Analysis failed')).toBeInTheDocument(), { timeout: 3000 });

    await submitText(user, 'A calm follow-up message.');
    expect(await screen.findByRole('heading', { name: 'Analysis results' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText('1 run this session')).toBeInTheDocument();
  });

  it('signs out from Settings and returns to local login', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
});
