# Reference sources and design basis

These sources inform the structure and technical choices. They do not make this application compliant medical software or official medical documentation.

1. Czech Decree No. 444/2024 Coll., on medical documentation (effective 1 January 2025): https://www.zakonyprolidi.cz/cs/2024-444
   - Useful for understanding the types and contents of provider medical documentation, discharge reports, patient summaries and record requirements.
   - This personal application is not intended to be a provider's statutory medical record.

2. HL7 FHIR R5 – MedicationRequest: https://hl7.org/fhir/R5/medicationrequest.html
   - Medication order/request semantics; distinguishes request from administration and medication statement.

3. HL7 FHIR R5 – MedicationAdministration: https://hl7.org/fhir/R5/medicationadministration.html
   - Actual administration event, dose, route, time, performer and circumstances such as refusal or partial administration.

4. HL7 FHIR R5 – Observation: https://hl7.org/fhir/R5/observation.html
   - Measurements and simple assertions such as vital signs and laboratory observations.

5. MDN – Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
   - Browser/platform differences for PWA installation, including iOS.

6. MDN – Offline and background operation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
   - Service worker and app-shell offline behavior.

7. W3C – WCAG 2.2: https://www.w3.org/TR/wcag/
   - Reflow, keyboard/focus, target size and accessibility requirements.

## Important legal and safety distinction
A private self-monitoring tool is not automatically subject to the same operational duties as a healthcare provider's statutory medical record. However, personal health data is sensitive and deserves strong security. If the application is later used by a provider, for clinical decisions, or as a medical device, reassess applicable Czech/EU law, GDPR, medical-device rules and professional requirements with qualified counsel and clinical experts.
