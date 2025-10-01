/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { throttle } from '../utils/throttle';

import './PromptController';
import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }
    #background {
      will-change: background-image;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #111;
      mix-blend-mode: lighten;
    }
    #grid {
      width: 90%;
      max-width: 1200px;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      grid-gap: 2vmin;
      justify-items: stretch;
      margin-bottom: 2vmin;
    }
    play-pause-button {
      width: 15vmin;
      height: 15vmin;
      margin-bottom: 2vmin;
    }
    #controls {
      display: flex;
      gap: 1em;
      align-items: center;
      color: white;
      font-size: 1.5vmin;
      background: #0006;
      padding: 1vmin 2vmin;
      border-radius: 1vmin;
    }
    #midi-info,
    label,
    select {
      font-family: monospace;
    }
    select {
      background: #333;
      color: white;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0.25em;
    }
    #show-cc-label {
      cursor: pointer;
      user-select: none;
    }
    @media only screen and (max-width: 600px) {
      #grid {
        grid-template-columns: repeat(4, 1fr);
        width: 95%;
        grid-gap: 3vmin;
      }
      play-pause-button {
        width: 20vmin;
        height: 20vmin;
      }
      #controls {
        font-size: 2vmin;
        flex-direction: column;
        gap: 0.5em;
        padding: 1.5vmin;
      }
    }
  `;

  @property({ type: Object }) prompts: Map<string, Prompt> = new Map();
  @property({ type: String }) playbackState: PlaybackState = 'stopped';
  @property({ type: Number }) audioLevel = 0;

  @state() private showCC = false;
  @state() private midiDispatcher = new MidiDispatcher();
  @state() private midiInputIds: string[] = [];
  @state() private hasMidi = true;
  @state() private filteredPrompts = new Set<string>();
  @state() private numCols = 6;

  private ro: ResizeObserver;

  constructor(prompts: Map<string, Prompt>) {
    super();
    this.prompts = prompts;
    this.handlePromptChanged = this.handlePromptChanged.bind(this);
    this.ro = new ResizeObserver(this.handleResize.bind(this));
  }
  
  private handleResize() {
    this.numCols = this.offsetWidth <= 600 ? 4 : 6;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.ro.observe(this);
    this.handleResize();
    this.midiDispatcher
      .getMidiAccess()
      .then((ids) => {
        this.midiInputIds = ids;
      })
      .catch((e) => {
        this.hasMidi = false;
        this.dispatchEvent(new CustomEvent('error', { detail: e.message }));
      });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.ro.unobserve(this);
  }

  public addFilteredPrompt(text: string) {
    this.filteredPrompts.add(text);
    this.requestUpdate();
  }

  private handlePlayPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  private handleMidiDeviceChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.midiDispatcher.activeMidiInputId = select.value;
    this.requestUpdate();
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const newPrompt = e.detail;
    this.prompts.set(newPrompt.promptId, newPrompt);
    this.dispatchPromptsChanged();
    this.requestUpdate('prompts');
  }

  private dispatchPromptsChanged = throttle(() => {
    this.dispatchEvent(
      new CustomEvent<Map<string, Prompt>>('prompts-changed', {
        detail: this.prompts,
      }),
    );
  }, 100);

  private generateBackground() {
    const numCols = this.numCols;
    const numRows = Math.ceil(this.prompts.size / numCols);

    const activePrompts = Array.from(this.prompts.values()).filter(
      (p) => p.weight > 0 && !this.filteredPrompts.has(p.text),
    );

    if (activePrompts.length === 0) {
      return { backgroundImage: 'none' };
    }

    const gradients = activePrompts.map((p) => {
      const promptIndex = Array.from(this.prompts.values()).findIndex(
        (prompt) => prompt.promptId === p.promptId,
      );
      const row = Math.floor(promptIndex / numCols);
      const col = promptIndex % numCols;

      const y = numRows <= 1 ? 50 : (row / (numRows - 1)) * 100;
      const x = numCols <= 1 ? 50 : (col / (numCols - 1)) * 100;
      
      const size = 25 * p.weight * (1 + this.audioLevel);

      return `radial-gradient(circle at ${x}% ${y}%, ${p.color}80 0%, ${p.color}00 ${size}vmin)`;
    });

    return { backgroundImage: gradients.join(',') };
  }

  private renderPrompts() {
    return Array.from(this.prompts.values()).map((p) => {
      return html`<prompt-controller
        .promptId=${p.promptId}
        .text=${p.text}
        .weight=${p.weight}
        .cc=${p.cc}
        .color=${p.color}
        .showCC=${this.showCC}
        .midiDispatcher=${this.midiDispatcher}
        .audioLevel=${this.audioLevel}
        ?filtered=${this.filteredPrompts.has(p.text)}
        @prompt-changed=${this.handlePromptChanged}></prompt-controller>`;
    });
  }

  private renderMidiControls() {
    if (!this.hasMidi) return html``;
    const options = this.midiInputIds.map((id) => {
      return html`<option value=${id}>
        ${this.midiDispatcher.getDeviceName(id)}
      </option>`;
    });

    const activeDeviceName = this.midiDispatcher.getDeviceName(
      this.midiDispatcher.activeMidiInputId!,
    );
    const midiInfo =
      this.midiInputIds.length > 0
        ? `${activeDeviceName || 'Select Input'}`
        : 'No MIDI devices found.';

    return html`
      <div id="midi-info">${midiInfo}</div>
      ${this.midiInputIds.length > 1 ?
        html`<select
          @change=${this.handleMidiDeviceChange}
          .value=${this.midiDispatcher.activeMidiInputId || ''}>
          ${options}
        </select>` : ''
      }
      <label id="show-cc-label">
        Show CC:
        <input
          type="checkbox"
          .checked=${this.showCC}
          @change=${() => (this.showCC = !this.showCC)} />
      </label>
    `;
  }

  override render() {
    const backgroundStyle = this.generateBackground();
    return html`
      <div id="background" style=${styleMap(backgroundStyle)}></div>
      <div id="grid">${this.renderPrompts()}</div>
      <play-pause-button
        .playbackState=${this.playbackState}
        @click=${this.handlePlayPause}>
      </play-pause-button>
      <div id="controls">${this.renderMidiControls()}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prompt-dj-midi': PromptDjMidi;
  }
}