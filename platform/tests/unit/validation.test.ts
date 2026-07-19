// =============================================================================
// Tests para safeParseForm — cubre TODAS las reglas declarativas.
// =============================================================================

import { describe, it, expect } from "vitest";
import { safeParseForm, type Rule } from "@/lib/validation";

function makeFD(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("safeParseForm — campo requerido", () => {
  it("required:true con valor vacio devuelve ok:false con field correcto", () => {
    const fd = makeFD({ nombre: "" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("nombre");
      expect(res.message).toContain("nombre");
      expect(res.message).toContain("obligatorio");
    }
  });

  it("required:true con valor ausente (no presente en FD) devuelve ok:false", () => {
    const fd = makeFD({}); // sin 'nombre'
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.field).toBe("nombre");
  });

  it("required:true con valor presente devuelve ok:true con data poblado", () => {
    const fd = makeFD({ nombre: "Juan" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({ nombre: "Juan" });
    }
  });

  it("required:false con valor vacio devuelve ok:true con data:null", () => {
    const fd = makeFD({ nombre: "" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: false, type: "string" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({ nombre: null });
    }
  });

  it("required:false con valor ausente devuelve ok:true con data:null", () => {
    const fd = makeFD({});
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: false, type: "string" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({ nombre: null });
    }
  });
});

describe("safeParseForm — type:string con min/max", () => {
  it("min:1 con string vacio y required:true → error (via missing)", () => {
    const fd = makeFD({ nombre: "" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string", min: 1 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
  });

  it("min:3 con string de 2 chars → error con mensaje de min", () => {
    const fd = makeFD({ nombre: "ab" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string", min: 3 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("nombre");
      expect(res.message).toContain("3 caracteres");
    }
  });

  it("min:3 con string de 3 chars → ok", () => {
    const fd = makeFD({ nombre: "abc" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string", min: 3 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.nombre).toBe("abc");
  });

  it("max:5 con string de 6 chars → error", () => {
    const fd = makeFD({ nombre: "abcdef" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string", max: 5 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("nombre");
      expect(res.message).toContain("5 caracteres");
    }
  });

  it("max:5 con string de 5 chars → ok", () => {
    const fd = makeFD({ nombre: "abcde" });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string", max: 5 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
  });
});

describe("safeParseForm — type:email", () => {
  it("email valido → ok, lowercased", () => {
    const fd = makeFD({ email: "User@Example.COM" });
    const schema: Record<string, Rule> = {
      email: { name: "email", required: true, type: "email" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.email).toBe("user@example.com");
    }
  });

  it("email sin arroba → error", () => {
    const fd = makeFD({ email: "userexample.com" });
    const schema: Record<string, Rule> = {
      email: { name: "email", required: true, type: "email" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("email");
      expect(res.message).toContain("email");
    }
  });

  it("email sin dominio → error", () => {
    const fd = makeFD({ email: "user@" });
    const schema: Record<string, Rule> = {
      email: { name: "email", required: true, type: "email" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
  });

  it("email sin TLD → error", () => {
    const fd = makeFD({ email: "user@example" });
    const schema: Record<string, Rule> = {
      email: { name: "email", required: true, type: "email" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
  });
});

describe("safeParseForm — type:number", () => {
  it("numero finito → ok, tipificado a number", () => {
    const fd = makeFD({ edad: "42" });
    const schema: Record<string, Rule> = {
      edad: { name: "edad", required: true, type: "number" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.edad).toBe(42);
      expect(typeof res.data.edad).toBe("number");
    }
  });

  it("numero decimal finito → ok", () => {
    const fd = makeFD({ precio: "1.99" });
    const schema: Record<string, Rule> = {
      precio: { name: "precio", required: true, type: "number" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.precio).toBe(1.99);
  });

  it("texto invalido → error", () => {
    const fd = makeFD({ edad: "abc" });
    const schema: Record<string, Rule> = {
      edad: { name: "edad", required: true, type: "number" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("edad");
      expect(res.message).toContain("numérico");
    }
  });

  it("integer:true con decimal → error", () => {
    const fd = makeFD({ edad: "1.5" });
    const schema: Record<string, Rule> = {
      edad: { name: "edad", required: true, type: "number", integer: true },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("edad");
      expect(res.message).toContain("entero");
    }
  });

  it("integer:true con entero → ok", () => {
    const fd = makeFD({ edad: "5" });
    const schema: Record<string, Rule> = {
      edad: { name: "edad", required: true, type: "number", integer: true },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.edad).toBe(5);
  });

  it("min:0 con -1 → error", () => {
    const fd = makeFD({ n: "-1" });
    const schema: Record<string, Rule> = {
      n: { name: "n", required: true, type: "number", min: 0 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("≥ 0");
  });

  it("max:100 con 150 → error", () => {
    const fd = makeFD({ n: "150" });
    const schema: Record<string, Rule> = {
      n: { name: "n", required: true, type: "number", max: 100 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("≤ 100");
  });

  it("min/max en rango → ok", () => {
    const fd = makeFD({ n: "50" });
    const schema: Record<string, Rule> = {
      n: { name: "n", required: true, type: "number", min: 0, max: 100 },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
  });
});

describe("safeParseForm — type:boolean", () => {
  it("ausente (null) → false", () => {
    const fd = makeFD({});
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: false, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(false);
  });

  it("vacio (\"\") → false", () => {
    const fd = makeFD({ acepta: "" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: false, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(false);
  });

  it('"on" → true', () => {
    const fd = makeFD({ acepta: "on" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: false, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(true);
  });

  it('"true" → true', () => {
    const fd = makeFD({ acepta: "true" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: false, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(true);
  });

  it('"0" → false', () => {
    const fd = makeFD({ acepta: "0" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: false, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(false);
  });

  it('"false" → false', () => {
    const fd = makeFD({ acepta: "false" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: false, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(false);
  });

  it("required:true con checkbox off (vacio) → error", () => {
    const fd = makeFD({ acepta: "" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: true, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.field).toBe("acepta");
  });

  it("required:true con \"on\" → ok con true", () => {
    const fd = makeFD({ acepta: "on" });
    const schema: Record<string, Rule> = {
      acepta: { name: "acepta", required: true, type: "boolean" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.acepta).toBe(true);
  });
});

describe("safeParseForm — type:enum", () => {
  it("valor valido → ok", () => {
    const fd = makeFD({ estado: "Finalizada" });
    const schema: Record<string, Rule> = {
      estado: {
        name: "estado",
        required: true,
        type: "enum",
        values: ["Pendiente", "En ejecución", "Finalizada"],
      },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.estado).toBe("Finalizada");
  });

  it("valor invalido → error con la lista de values en el mensaje", () => {
    const fd = makeFD({ estado: "Otro" });
    const schema: Record<string, Rule> = {
      estado: {
        name: "estado",
        required: true,
        type: "enum",
        values: ["Pendiente", "En ejecución", "Finalizada"],
      },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("estado");
      expect(res.message).toContain("Pendiente");
      expect(res.message).toContain("En ejecución");
      expect(res.message).toContain("Finalizada");
    }
  });

  it("enum required:false con valor vacio → ok con null", () => {
    const fd = makeFD({ estado: "" });
    const schema: Record<string, Rule> = {
      estado: {
        name: "estado",
        required: false,
        type: "enum",
        values: ["A", "B"],
      },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.estado).toBeNull();
  });
});

describe("safeParseForm — schema combinado", () => {
  it("schema multi-campo con todos los valores validos → ok con todos los datos", () => {
    const fd = makeFD({
      nombre: "Juan Pérez",
      email: "juan@example.com",
      edad: "30",
      acepta: "on",
      estado: "Pendiente",
    });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string", min: 1, max: 100 },
      email: { name: "email", required: true, type: "email" },
      edad: { name: "edad", required: true, type: "number", integer: true, min: 0, max: 150 },
      acepta: { name: "acepta", required: true, type: "boolean" },
      estado: {
        name: "estado",
        required: true,
        type: "enum",
        values: ["Pendiente", "En ejecución", "Finalizada"],
      },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({
        nombre: "Juan Pérez",
        email: "juan@example.com",
        edad: 30,
        acepta: true,
        estado: "Pendiente",
      });
    }
  });

  it("falla en el primer campo invalido y devuelve ese field", () => {
    const fd = makeFD({
      nombre: "Juan",
      email: "no-es-email",
      edad: "30",
    });
    const schema: Record<string, Rule> = {
      nombre: { name: "nombre", required: true, type: "string" },
      email: { name: "email", required: true, type: "email" },
      edad: { name: "edad", required: true, type: "number" },
    };
    const res = safeParseForm(fd, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("email");
    }
  });
});
