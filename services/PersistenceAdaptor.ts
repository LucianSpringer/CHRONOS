/**
 * PersistenceAdaptor - Secure state persistence layer with Base64 encoding
 * 
 * This class provides a secure interface for saving and loading game state
 * from localStorage with Base64 encoding to obscure the data structure.
 */

export class PersistenceAdaptor {
  /**
   * Save state data to localStorage with Base64 encoding
   * @param stateKey - The key to store the data under
   * @param stateData - The state object to save
   */
  static save(stateKey: string, stateData: any): void {
    try {
      // Serialize to JSON
      const jsonString = JSON.stringify(stateData);
      
      // Encode to Base64
      const base64Encoded = btoa(jsonString);
      
      // Save to localStorage
      localStorage.setItem(stateKey, base64Encoded);
    } catch (error) {
      console.error('PersistenceAdaptor: Failed to save state', error);
      // Fallback to direct save if Base64 encoding fails
      try {
        localStorage.setItem(stateKey, JSON.stringify(stateData));
      } catch (fallbackError) {
        console.error('PersistenceAdaptor: Fallback save also failed', fallbackError);
      }
    }
  }

  /**
   * Load state data from localStorage with Base64 decoding
   * @param stateKey - The key to retrieve the data from
   * @returns The parsed state object or null if not found/corrupted
   */
  static load(stateKey: string): any | null {
    try {
      const storedData = localStorage.getItem(stateKey);
      
      if (!storedData) {
        return null;
      }

      // Try to decode from Base64 first
      try {
        const decodedString = atob(storedData);
        return JSON.parse(decodedString);
      } catch (base64Error) {
        // If Base64 decoding fails, try parsing directly (backward compatibility)
        console.warn('PersistenceAdaptor: Base64 decoding failed, trying direct parse');
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error('PersistenceAdaptor: Failed to load state', error);
      return null;
    }
  }

  /**
   * Clear state data from localStorage
   * @param stateKey - The key to remove
   */
  static clear(stateKey: string): void {
    try {
      localStorage.removeItem(stateKey);
    } catch (error) {
      console.error('PersistenceAdaptor: Failed to clear state', error);
    }
  }

  /**
   * Check if state exists in localStorage
   * @param stateKey - The key to check
   * @returns true if the key exists, false otherwise
   */
  static exists(stateKey: string): boolean {
    return localStorage.getItem(stateKey) !== null;
  }
}
