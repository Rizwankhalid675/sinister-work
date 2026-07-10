/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Deployed on: Sales Order
 * Syncs shipping phone → custbody231 on SO create/edit.
 * Reads addrPhone from shipping/billing address subrecord
 * because REST API sets addrPhone, not the flat shipphone field.
 */
define(['N/record'], (record) => {

  function afterSubmit(context) {
    if (
      context.type !== context.UserEventType.CREATE &&
      context.type !== context.UserEventType.EDIT
    ) return;

    try {
      const rec = record.load({
        type: record.Type.SALES_ORDER,
        id: context.newRecord.id
      });

      // Try flat fields first (UI/SOAP), then address subrecord (REST API)
      let phone =
        rec.getValue({ fieldId: 'shipphone' }) ||
        rec.getValue({ fieldId: 'billphone' }) ||
        '';

      if (!phone) {
        const shipAddr = rec.getSubrecord({ fieldId: 'shippingaddress' });
        if (shipAddr) phone = shipAddr.getValue({ fieldId: 'addrphone' }) || '';
      }

      if (!phone) {
        const billAddr = rec.getSubrecord({ fieldId: 'billingaddress' });
        if (billAddr) phone = billAddr.getValue({ fieldId: 'addrphone' }) || '';
      }

      if (!phone) return;

      record.submitFields({
        type: record.Type.SALES_ORDER,
        id: context.newRecord.id,
        values: { custbody231: phone },
        options: { enableSourcing: false, ignoreMandatoryFields: true }
      });

      log.debug('SD Sync', `SO ${context.newRecord.id} → custbody231=${phone}`);
    } catch (e) {
      log.error('SD Sync Error', e.message);
    }
  }

  return { afterSubmit };
});
