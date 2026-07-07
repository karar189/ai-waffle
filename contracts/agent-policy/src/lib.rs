#![no_main]
#![no_std]

extern crate alloc;

use alloc::{string::{String, ToString}, vec};
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    bytesrepr::{FromBytes, ToBytes},
    contracts::{EntryPoint, EntryPoints, NamedKeys},
    ApiError, CLType, CLTyped, EntryPointAccess, EntryPointType, Key, Parameter, U512, URef,
};

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

const CONTRACT_NAME: &str = "waffle_trade_agent_policy";
const PACKAGE_HASH_KEY: &str = "waffle_trade_agent_policy_package_hash";
const CONTRACT_HASH_KEY: &str = "waffle_trade_agent_policy_contract_hash";

const OWNERS: &str = "owners";
const AGENTS: &str = "agents";
const MAX_MOVE_MOTES: &str = "max_move_motes";
const RISK_LEVELS: &str = "risk_levels";
const ALLOWED_ACTIONS: &str = "allowed_actions";
const ALLOWED_PROTOCOLS: &str = "allowed_protocols";
const PAUSED: &str = "paused";
const REVOKED: &str = "revoked";
const INTENT_COUNTS: &str = "intent_counts";
const LAST_INTENT_HASHES: &str = "last_intent_hashes";
const LAST_INTENT_SUMMARIES: &str = "last_intent_summaries";

#[repr(u16)]
enum Error {
    MissingDictionary = 1,
    Revoked = 2,
}

impl From<Error> for ApiError {
    fn from(error: Error) -> Self {
        ApiError::User(error as u16)
    }
}

fn caller_key() -> String {
    runtime::get_caller().to_formatted_string()
}

fn dictionary_uref(name: &str) -> URef {
    runtime::get_key(name)
        .and_then(Key::into_uref)
        .unwrap_or_revert_with(Error::MissingDictionary)
}

fn put<T: ToBytes + CLTyped>(
    dictionary: &str,
    key: &str,
    value: T,
) {
    storage::dictionary_put(dictionary_uref(dictionary), key, value);
}

fn get<T: FromBytes + CLTyped>(
    dictionary: &str,
    key: &str,
) -> Option<T> {
    storage::dictionary_get(dictionary_uref(dictionary), key).unwrap_or_revert()
}

fn assert_not_revoked(owner: &str) {
    if get::<bool>(REVOKED, owner).unwrap_or(false) {
        runtime::revert(Error::Revoked);
    }
}

fn write_policy(
    owner: &str,
    agent_key: String,
    max_move_motes: U512,
    risk_level: u8,
    allowed_actions: String,
    allowed_protocols: String,
) {
    put(OWNERS, owner, owner.to_string());
    put(AGENTS, owner, agent_key);
    put(MAX_MOVE_MOTES, owner, max_move_motes);
    put(RISK_LEVELS, owner, risk_level);
    put(ALLOWED_ACTIONS, owner, allowed_actions);
    put(ALLOWED_PROTOCOLS, owner, allowed_protocols);
    put(PAUSED, owner, false);
    put(REVOKED, owner, false);
    if get::<u64>(INTENT_COUNTS, owner).is_none() {
        put(INTENT_COUNTS, owner, 0u64);
    }
}

#[no_mangle]
pub extern "C" fn register_policy() {
    let owner = caller_key();
    write_policy(
        &owner,
        runtime::get_named_arg("agent_key"),
        runtime::get_named_arg("max_move_motes"),
        runtime::get_named_arg("risk_level"),
        runtime::get_named_arg("allowed_actions"),
        runtime::get_named_arg("allowed_protocols"),
    );
}

#[no_mangle]
pub extern "C" fn update_policy() {
    let owner = caller_key();
    assert_not_revoked(&owner);
    write_policy(
        &owner,
        runtime::get_named_arg("agent_key"),
        runtime::get_named_arg("max_move_motes"),
        runtime::get_named_arg("risk_level"),
        runtime::get_named_arg("allowed_actions"),
        runtime::get_named_arg("allowed_protocols"),
    );
}

#[no_mangle]
pub extern "C" fn pause_policy() {
    let owner = caller_key();
    assert_not_revoked(&owner);
    put(PAUSED, &owner, true);
}

#[no_mangle]
pub extern "C" fn resume_policy() {
    let owner = caller_key();
    assert_not_revoked(&owner);
    put(PAUSED, &owner, false);
}

#[no_mangle]
pub extern "C" fn revoke_policy() {
    let owner = caller_key();
    put(PAUSED, &owner, true);
    put(REVOKED, &owner, true);
}

#[no_mangle]
pub extern "C" fn record_intent() {
    let owner = caller_key();
    assert_not_revoked(&owner);

    let intent_hash: String = runtime::get_named_arg("intent_hash");
    let action: String = runtime::get_named_arg("action");
    let amount_motes: U512 = runtime::get_named_arg("amount_motes");
    let venue: String = runtime::get_named_arg("venue");
    let count = get::<u64>(INTENT_COUNTS, &owner).unwrap_or(0).saturating_add(1);
    let summary = action + "|" + &amount_motes.to_string() + "|" + &venue;

    put(INTENT_COUNTS, &owner, count);
    put(LAST_INTENT_HASHES, &owner, intent_hash);
    put(LAST_INTENT_SUMMARIES, &owner, summary);
}

fn dictionary_named_keys() -> NamedKeys {
    let mut named_keys = NamedKeys::new();
    for name in [
        OWNERS,
        AGENTS,
        MAX_MOVE_MOTES,
        RISK_LEVELS,
        ALLOWED_ACTIONS,
        ALLOWED_PROTOCOLS,
        PAUSED,
        REVOKED,
        INTENT_COUNTS,
        LAST_INTENT_HASHES,
        LAST_INTENT_SUMMARIES,
    ] {
        let uref = storage::new_dictionary(name).unwrap_or_revert();
        named_keys.insert(name.to_string(), Key::URef(uref));
    }
    named_keys
}

fn entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();
    let common_policy_params = vec![
        Parameter::new("agent_key", CLType::String),
        Parameter::new("max_move_motes", CLType::U512),
        Parameter::new("risk_level", CLType::U8),
        Parameter::new("allowed_actions", CLType::String),
        Parameter::new("allowed_protocols", CLType::String),
    ];

    entry_points.add_entry_point(EntryPoint::new(
        "register_policy",
        common_policy_params.clone(),
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Caller,
    ));
    entry_points.add_entry_point(EntryPoint::new(
        "update_policy",
        common_policy_params,
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Caller,
    ));

    for name in ["pause_policy", "resume_policy", "revoke_policy"] {
        entry_points.add_entry_point(EntryPoint::new(
            name,
            vec![],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Caller,
        ));
    }

    entry_points.add_entry_point(EntryPoint::new(
        "record_intent",
        vec![
            Parameter::new("intent_hash", CLType::String),
            Parameter::new("action", CLType::String),
            Parameter::new("amount_motes", CLType::U512),
            Parameter::new("venue", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Caller,
    ));

    entry_points
}

#[no_mangle]
pub extern "C" fn call() {
    let (contract_hash, _version) = storage::new_contract(
        entry_points().into(),
        Some(dictionary_named_keys()),
        Some(PACKAGE_HASH_KEY.to_string()),
        Some(CONTRACT_NAME.to_string()),
        None,
    );
    runtime::put_key(CONTRACT_HASH_KEY, contract_hash.into());
}
