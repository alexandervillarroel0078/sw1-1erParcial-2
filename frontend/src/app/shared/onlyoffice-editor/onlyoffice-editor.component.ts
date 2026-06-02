import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnDestroy,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import StarterKit from '@tiptap/starter-kit';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

import type { DocumentoColaborativo } from '../../core/models/doc-colaborativo.model';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

const CURSOR_COLORS = [
  '#958DF1',
  '#F98181',
  '#FBBC88',
  '#FAF594',
  '#70CFF8',
  '#94FADB',
  '#B9F18D',
];

function cursorColorForUser(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]!;
}

@Component({
  selector: 'app-onlyoffice-editor',
  standalone: true,
  templateUrl: './onlyoffice-editor.component.html',
  styleUrl: './onlyoffice-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlyofficeEditorComponent implements OnDestroy {
  readonly doc = input.required<DocumentoColaborativo>();
  readonly readonly = input(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly editorHost = viewChild<ElementRef<HTMLElement>>('editorHost');

  editor: Editor | null = null;

  private ydoc: Y.Doc | null = null;
  private provider: HocuspocusProvider | null = null;
  private lastRoomKey = '';

  constructor() {
    effect(() => {
      const documento = this.doc();
      const soloLectura = this.readonly();
      if (!documento?.tramiteId || !documento?.nodoId || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const roomKey = `${documento.tramiteId}-${documento.nodoId}:${soloLectura}`;
      if (roomKey === this.lastRoomKey) {
        this.editor?.setEditable(!soloLectura);
        return;
      }
      this.lastRoomKey = roomKey;
      afterNextRender(
        () => {
          this.initEditor(documento, soloLectura);
        },
        { injector: this.injector },
      );
    });
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  private initEditor(documento: DocumentoColaborativo, soloLectura: boolean): void {
    const host = this.editorHost()?.nativeElement;
    if (!host) {
      return;
    }

    this.destroyEditor();

    const usuario = this.auth.getUsuario();
    const userName = usuario.nombre?.trim() || usuario.correo || 'Usuario';
    const userColor = cursorColorForUser(userName);
    const roomName = `${documento.tramiteId}-nodo-${documento.nodoId}`;

    this.ydoc = new Y.Doc();
    this.provider = new HocuspocusProvider({
      url: environment.collabUrl,
      name: roomName,
      document: this.ydoc,
    });

    this.editor = new Editor({
      element: host,
      editable: !soloLectura,
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: this.ydoc,
        }),
        CollaborationCursor.configure({
          provider: this.provider,
          user: {
            name: userName,
            color: userColor,
          },
        }),
      ],
      onTransaction: () => {
        this.cdr.markForCheck();
      },
    });

    this.cdr.markForCheck();
  }

  private destroyEditor(): void {
    this.editor?.destroy();
    this.editor = null;
    this.provider?.destroy();
    this.provider = null;
    this.ydoc?.destroy();
    this.ydoc = null;
    this.lastRoomKey = '';
  }
}
