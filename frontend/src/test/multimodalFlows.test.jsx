import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

describe('Multimodal analysis flows and full user states', () => {
  it('supports image-only analysis flow and displays image result card', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);

    await user.click(screen.getByRole('button', { name: 'Image' }));
    expect(await screen.findByRole('heading', { name: 'Image analysis' })).toBeInTheDocument();

    const fileInput = document.querySelector('#image-input');
    const imageFile = new File(['image-content'], 'happy-face.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [imageFile] } });

    const consent = screen.getByRole('checkbox', { name: 'Proceed' });
    await user.click(consent);

    const submitBtn = screen.getByRole('button', { name: /Analyse image/i });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    expect(await screen.findByRole('heading', { name: 'Analysis results' })).toBeInTheDocument();
    expect(screen.getByText('Positive visible cues')).toBeInTheDocument();
    expect(screen.getByText(/No text provided/i)).toBeInTheDocument();
    expect(screen.getByText(/No voice provided/i)).toBeInTheDocument();
  });

  it('supports voice-only analysis flow and displays voice result card', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);

    await user.click(screen.getByRole('button', { name: 'Voice' }));
    expect(await screen.findByRole('heading', { name: 'Voice analysis' })).toBeInTheDocument();

    const fileInput = document.querySelector('#audio-input');
    const audioFile = new File(['audio-content'], 'happy-voice.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [audioFile] } });

    const consent = screen.getByRole('checkbox', { name: 'Proceed' });
    await user.click(consent);

    const submitBtn = screen.getByRole('button', { name: /Analyse voice/i });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    expect(await screen.findByRole('heading', { name: 'Analysis results' })).toBeInTheDocument();
    expect(screen.getByText('Warm delivery')).toBeInTheDocument();
    expect(screen.getByText(/No text provided/i)).toBeInTheDocument();
    expect(screen.getByText(/No image provided/i)).toBeInTheDocument();
  });

  it('supports multimodal analysis combining text, image, and voice with mismatch cue', async () => {
    const user = userEvent.setup();
    await enterWorkspace(user);

    await user.click(screen.getByRole('button', { name: 'Multimodal' }));
    expect(await screen.findByRole('heading', { name: 'Multimodal analysis' })).toBeInTheDocument();

    // Fill text
    await user.type(screen.getByLabelText('Text message'), 'I am deeply worried about the deadline.');

    // Upload image
    const imageInput = document.querySelector('#image-input');
    const imageFile = new File(['image-content'], 'happy-smile.png', { type: 'image/png' });
    fireEvent.change(imageInput, { target: { files: [imageFile] } });

    // Upload audio
    const audioInput = document.querySelector('#audio-input');
    const audioFile = new File(['audio-content'], 'steady-tone.mp3', { type: 'audio/mpeg' });
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    // Confirm consent
    const consent = screen.getByRole('checkbox', { name: 'Proceed' });
    await user.click(consent);

    const submitBtn = screen.getByRole('button', { name: /Analyse multimodal/i });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    expect(await screen.findByRole('heading', { name: 'Analysis results' })).toBeInTheDocument();
    expect(screen.getByText('Concerned')).toBeInTheDocument();
    expect(screen.getByText('Positive visible cues')).toBeInTheDocument();
    expect(screen.getByText('Steady delivery')).toBeInTheDocument();

    // Check mismatch alert
    expect(screen.getByText(/Possible cue mismatch detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Communication suggestion/i)).toBeInTheDocument();
  });

  it('tests full lifecycle: login, consent gating, history, deletion, retry, sign out', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Login state
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Login' }));

    // Consent gating: submit button disabled without consent
    const textInput = screen.getByLabelText('Text message');
    await user.type(textInput, 'Looking forward to our sync.');
    const consent = screen.getByRole('checkbox', { name: 'Proceed' });
    const submitBtn = screen.getByRole('button', { name: /Analyse text/i });
    expect(submitBtn).toBeDisabled();

    // Consent given: button enabled
    await user.click(consent);
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    // Results rendered
    expect(await screen.findByRole('heading', { name: 'Analysis results' })).toBeInTheDocument();

    // History saved
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText('1 run this session')).toBeInTheDocument();

    // Deletion: clear history
    await user.click(screen.getByRole('button', { name: 'Clear session history' }));
    expect(await screen.findByText('No analyses yet this session')).toBeInTheDocument();

    // Test retry on failure
    await user.click(screen.getByRole('button', { name: 'Text' }));
    const textInput2 = screen.getByLabelText('Text message');
    await user.clear(textInput2);
    fireEvent.change(textInput2, { target: { value: '[error] failed run' } });
    const consent2 = screen.getByRole('checkbox', { name: 'Proceed' });
    if (!consent2.checked) await user.click(consent2);
    const submitBtn2 = screen.getByRole('button', { name: /Analyse text/i });
    expect(submitBtn2).toBeEnabled();
    await user.click(submitBtn2);


    expect(await screen.findByText('Analysis failed', {}, { timeout: 3000 })).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    expect(retryBtn).toBeEnabled();

    // Sign out state
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument();
  }, 15000);
});

