"use strict";
/**
 * Kibo User Profile Schema
 * Stored in Firestore at: users/{userId}/profile/weekly
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIGGER_DESCRIPTIONS = exports.TRIGGER_LABELS = void 0;
exports.TRIGGER_LABELS = {
    lack_of_sleep: "Sono insuficiente",
    social_isolation: "Isolamento social",
    no_exercise: "Sedentarismo",
    high_stress: "Estresse elevado",
    poor_circadian: "Ritmo circadiano irregular",
    weekend_isolation: "Isolamento nos fins de semana",
    monday_blues: "Segunda-feira difícil",
};
exports.TRIGGER_DESCRIPTIONS = {
    lack_of_sleep: "Dias com menos de 5h de sono tendem a ter humor pior no dia seguinte",
    social_isolation: "Baixa socialização está correlacionada com queda de humor",
    no_exercise: "Dias sem atividade física estão associados a humor mais baixo",
    high_stress: "Períodos de alto estresse precedem dias ruins com frequência",
    poor_circadian: "Inconsistência no horário de dormir/acordar prejudica o bem-estar",
    weekend_isolation: "Fins de semana isolados podem indicar risco elevado",
    monday_blues: "Segundas-feiras consistentemente ruins podem indicar reação ao trabalho",
};
//# sourceMappingURL=userProfile.js.map