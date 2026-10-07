import { afterEach, describe, expect, it, vi } from "vitest";
import { urlPdfPresentationDemo } from "./demo-pdf.js";

describe("PDF de presentation du demonstrateur",()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it("genere un vrai Blob PDF distinct d'un document d'enseignement",()=>{
    const createObjectURL=vi.fn().mockReturnValue("blob:demo-pdf");
    vi.stubGlobal("URL",{createObjectURL});
    const url=urlPdfPresentationDemo("Ressource de presentation","Version 1.0");
    expect(url).toBe("blob:demo-pdf");
    const blob=createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);
  });
});
