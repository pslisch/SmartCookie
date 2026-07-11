export class ScormApiBridge {
  private attemptId: string;
  private cmi: Record<string, string> = {};
  private lastError: string = '0';
  private isInitialized = false;
  private isFinished = false;

  constructor(attemptId: string, initialCmi: Record<string, string> = {}) {
    this.attemptId = attemptId;
    // Set up default values
    this.cmi = {
      'cmi.core.lesson_status': 'not attempted',
      'cmi.core.lesson_location': '',
      'cmi.core.score.raw': '',
      'cmi.core.score.min': '',
      'cmi.core.score.max': '',
      'cmi.core.session_time': '00:00:00',
      'cmi.suspend_data': '',
      ...initialCmi
    };
  }

  LMSInitialize(param: string): string {
    if (this.isFinished) {
      this.lastError = '101'; // General exception
      return 'false';
    }
    if (this.isInitialized) {
      this.lastError = '101'; // Already initialized
      return 'false';
    }
    this.isInitialized = true;
    this.lastError = '0';
    return 'true';
  }

  LMSGetValue(element: string): string {
    if (!this.isInitialized) {
      this.lastError = '301'; // Not initialized
      return '';
    }
    if (this.isFinished) {
      this.lastError = '101';
      return '';
    }

    this.lastError = '0';

    // Handle count requests dynamically
    if (element.endsWith('._count')) {
      const prefix = element.substring(0, element.length - 7);
      return this.getCount(prefix);
    }

    return this.cmi[element] !== undefined ? this.cmi[element] : '';
  }

  LMSSetValue(element: string, value: string): string {
    if (!this.isInitialized) {
      this.lastError = '301'; // Not initialized
      return 'false';
    }
    if (this.isFinished) {
      this.lastError = '101';
      return 'false';
    }

    this.lastError = '0';
    this.cmi[element] = String(value);
    return 'true';
  }

  LMSCommit(param: string): string {
    if (!this.isInitialized) {
      this.lastError = '301';
      return 'false';
    }
    if (this.isFinished) {
      this.lastError = '101';
      return 'false';
    }

    this.lastError = '0';
    this.commitToServer();
    return 'true';
  }

  LMSFinish(param: string): string {
    if (!this.isInitialized) {
      this.lastError = '301';
      return 'false';
    }
    if (this.isFinished) {
      this.lastError = '101';
      return 'false';
    }

    this.commitToServer();
    this.isFinished = true;
    this.isInitialized = false;
    this.lastError = '0';
    return 'true';
  }

  LMSGetLastError(): string {
    return this.lastError;
  }

  LMSGetErrorString(errorCode: string): string {
    const errorMap: Record<string, string> = {
      '0': 'No error',
      '101': 'General exception',
      '201': 'Invalid argument error',
      '202': 'Element cannot have children',
      '203': 'Element not writeable',
      '301': 'Not initialized',
      '401': 'Not implemented error',
      '405': 'Incorrect data type'
    };
    return errorMap[errorCode] || 'Unknown Error';
  }

  LMSGetDiagnostic(errorCode: string): string {
    return this.LMSGetErrorString(errorCode);
  }

  private getCount(prefix: string): string {
    const indices = new Set<string>();
    // Match cmi.objectives.0.id or similar pattern
    const escapedPrefix = prefix.replace(/\./g, '\\.');
    const regex = new RegExp(`^${escapedPrefix}\\.(\\d+)\\.`);
    for (const key of Object.keys(this.cmi)) {
      const match = key.match(regex);
      if (match) {
        indices.add(match[1]);
      }
    }
    return indices.size.toString();
  }

  private async commitToServer(): Promise<boolean> {
    try {
      const response = await fetch(`/api/content-attempts/${this.attemptId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCookie('csrfToken')
        },
        body: JSON.stringify({
          cmi: this.cmi
        })
      });

      if (!response.ok) {
        console.error('LMSCommit server update failed:', await response.text());
        return false;
      }
      return true;
    } catch (err) {
      console.error('LMSCommit connection error:', err);
      return false;
    }
  }

  private getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  }
}

export function initializeScormApiBridge(attemptId: string, initialCmi: Record<string, string> = {}): ScormApiBridge {
  const bridge = new ScormApiBridge(attemptId, initialCmi);
  
  const scormApi = {
    LMSInitialize: (param: string) => bridge.LMSInitialize(param),
    LMSGetValue: (element: string) => bridge.LMSGetValue(element),
    LMSSetValue: (element: string, value: string) => bridge.LMSSetValue(element, value),
    LMSCommit: (param: string) => bridge.LMSCommit(param),
    LMSFinish: (param: string) => bridge.LMSFinish(param),
    LMSGetLastError: () => bridge.LMSGetLastError(),
    LMSGetErrorString: (errorCode: string) => bridge.LMSGetErrorString(errorCode),
    LMSGetDiagnostic: (errorCode: string) => bridge.LMSGetDiagnostic(errorCode)
  };

  (window as any).API = scormApi;
  return bridge;
}
