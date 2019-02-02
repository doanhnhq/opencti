import { head } from 'ramda';
import uuid from 'uuid/v4';
import { delEditContext, setEditContext } from '../database/redis';
import {
  createRelation,
  deleteByID,
  deleteRelation,
  editInputTx,
  loadByID,
  monthFormat,
  notify,
  now,
  paginate,
  qk,
  yearFormat,
  prepareString
} from '../database/grakn';
import { BUS_TOPICS } from '../config/conf';

export const findAll = args => paginate('match $m isa Kill-Chain-Phase', args);

export const findById = killChainPhaseId => loadByID(killChainPhaseId);

export const findByPhaseName = args =>
  paginate(
    `match $m isa Kill-Chain-Phase; $m has phase_name "${prepareString(args.phaseName)}"`,
    args,
    false
  );

export const markingDefinitions = (killChainPhaseId, args) =>
  paginate(
    `match $marking isa Marking-Definition; 
    (marking:$marking, so:$killChainPhase) isa object_marking_refs; 
    $killChainPhase id ${killChainPhaseId}`,
    args,
    false,
  );

export const addKillChainPhase = async (user, killChainPhase) => {
  const createKillChainPhase = qk(`insert $killChainPhase isa Kill-Chain-Phase
    has type "kill-chain-phase";
    $killChainPhase has stix_id "kill-chain-phase--${uuid()}";
    $killChainPhase has kill_chain_name "${prepareString(
      killChainPhase.kill_chain_name
    )}";
    $killChainPhase has phase_name "${prepareString(
      killChainPhase.phase_name
    )}";
    $killChainPhase has phase_order "${prepareString(
      killChainPhase.phase_order
    )}";
    $killChainPhase has created ${now()};
    $killChainPhase has modified ${now()};
    $killChainPhase has revoked false;
    $killChainPhase has created_at ${now()};
    $killChainPhase has created_at_month "${monthFormat(now())}";
    $killChainPhase has created_at_year "${yearFormat(now())}";       
    $killChainPhase has updated_at ${now()};
  `);
  return createKillChainPhase.then(result => {
    const { data } = result;
    return loadByID(head(data).killChainPhase.id).then(created =>
      notify(BUS_TOPICS.KillChainPhase.ADDED_TOPIC, created)
    );
  });
};

export const killChainPhaseDelete = killChainPhaseId =>
  deleteByID(killChainPhaseId);

export const killChainPhaseAddRelation = (user, killChainPhaseId, input) =>
  createRelation(killChainPhaseId, input).then(relationData => {
    notify(BUS_TOPICS.KillChainPhase.EDIT_TOPIC, relationData.node, user);
    return relationData;
  });

export const killChainPhaseDeleteRelation = (
  user,
  killChainPhaseId,
  relationId
) =>
  deleteRelation(killChainPhaseId, relationId).then(relationData => {
    notify(BUS_TOPICS.KillChainPhase.EDIT_TOPIC, relationData.node, user);
    return relationData;
  });

export const killChainPhaseCleanContext = (user, killChainPhaseId) => {
  delEditContext(user, killChainPhaseId);
  return loadByID(killChainPhaseId).then(killChainPhase =>
    notify(BUS_TOPICS.KillChainPhase.EDIT_TOPIC, killChainPhase, user)
  );
};

export const killChainPhaseEditContext = (user, killChainPhaseId, input) => {
  setEditContext(user, killChainPhaseId, input);
  return loadByID(killChainPhaseId).then(killChainPhase =>
    notify(BUS_TOPICS.KillChainPhase.EDIT_TOPIC, killChainPhase, user)
  );
};

export const killChainPhaseEditField = (user, killChainPhaseId, input) =>
  editInputTx(killChainPhaseId, input).then(killChainPhase =>
    notify(BUS_TOPICS.KillChainPhase.EDIT_TOPIC, killChainPhase, user)
  );
