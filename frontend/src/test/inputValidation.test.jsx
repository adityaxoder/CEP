import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageInput } from '../components/ImageInput';
import { VoiceInput } from '../components/VoiceInput';

describe('ImageInput', () => {
  it('rejects invalid and oversized images', () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { rerender } = render(<ImageInput file={null} onFile={onFile} onError={onError} />);
    const input = document.querySelector('#image-input');

    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(onError).toHaveBeenLastCalledWith('Please select a JPEG, PNG, or WEBP image.');
    expect(onFile).not.toHaveBeenCalled();

    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })] },
    });
    expect(onError).toHaveBeenLastCalledWith('Image must be smaller than 5 MB.');

    const validFile = new File(['image'], 'smile.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [validFile] } });
    expect(onError).toHaveBeenLastCalledWith('');
    expect(onFile).toHaveBeenLastCalledWith(validFile);

    rerender(<ImageInput file={validFile} onFile={onFile} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove smile.png' }));
    expect(onFile).toHaveBeenLastCalledWith(null);
    expect(onError).toHaveBeenLastCalledWith('');
  });
});

describe('VoiceInput', () => {
  it('rejects invalid and oversized audio files and removes a valid file', () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { rerender } = render(<VoiceInput file={null} onFile={onFile} onError={onError} />);
    const input = document.querySelector('#audio-input');

    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(onError).toHaveBeenLastCalledWith('Please select an MP3, WAV, OGG, or WEBM audio file.');
    expect(onFile).not.toHaveBeenCalled();

    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.mp3', { type: 'audio/mpeg' })] },
    });
    expect(onError).toHaveBeenLastCalledWith('Audio file must be smaller than 10 MB.');

    const validFile = new File(['audio'], 'happy.mp3', { type: 'audio/mpeg' });
    fireEvent.change(input, { target: { files: [validFile] } });
    expect(onFile).toHaveBeenLastCalledWith(validFile);

    rerender(<VoiceInput file={validFile} onFile={onFile} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove happy.mp3' }));
    expect(onFile).toHaveBeenLastCalledWith(null);
    expect(onError).toHaveBeenLastCalledWith('');
  });
});
