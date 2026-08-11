import * as z from "zod";

export const IdSchema = z.string().trim().min(1, "Identifiant requis.");
export const DateInputSchema = z.iso.date({ error: "Date invalide." });
export const TimeInputSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.");
export const MonthInputSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide.");
export const DecimalInputSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(?:[.,]\d+)?$/, "Nombre décimal invalide.")
  .transform((value) => value.replace(",", "."));

export const PinInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, "Le PIN doit contenir 4 à 6 chiffres.");
