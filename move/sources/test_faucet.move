module deployer::test_faucet {

    use std::option;
    use std::signer;
    use std::string;
    use std::string::String;
    use aptos_framework::aptos_account;
    use aptos_framework::coin;
    use aptos_framework::fungible_asset;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object;
    use aptos_framework::object::Object;
    use aptos_framework::primary_fungible_store;

    /// Caller is not the deployer
    const E_NOT_DEPLOYER: u64 = 1;

    const DECIMALS: u8 = 6;

    const TFC: vector<u8> = b"Greg's Test Faucet Coin with 6 decimals";

    struct TestFaucetCoin {
        coin: u64,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct TestFaucetCaps has key {
        extend_ref: object::ExtendRef,
        burn_cap: coin::BurnCapability<TestFaucetCoin>,
        freeze_cap: coin::FreezeCapability<TestFaucetCoin>,
        mint_cap: coin::MintCapability<TestFaucetCoin>,
        burn_ref: fungible_asset::BurnRef,
        mint_ref: fungible_asset::MintRef,
        transfer_ref: fungible_asset::TransferRef,
    }

    public(friend) entry fun initialize(caller: &signer) {
        // Note caller has to be the same account as the contract publisher
        let caller_address = signer::address_of(caller);
        assert!(caller_address == @deployer, E_NOT_DEPLOYER);

        // Create Object to hold capabilities
        let constructor = object::create_named_object(caller, TFC);
        let extend_ref = object::generate_extend_ref(&constructor);
        let signer = object::generate_signer(&constructor);

        // Create an extra FA (that doesn't have a connected coin)
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor,
            option::none(),
            string::utf8(b"Test Fungible Asset"),
            string::utf8(b"TFA"),
            DECIMALS,
            string::utf8(b"https://cf-ipfs.com/ipfs/QmXCV91fiKgBBfU7yRevBHQohvj9HYHHJHxriFnRCJw4E7"),
            string::utf8(b"https://github.com/gregnazario/test-token-faucet"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(&constructor);
        let burn_ref = fungible_asset::generate_burn_ref(&constructor);
        let transfer_ref = fungible_asset::generate_transfer_ref(&constructor);

        // Create coin
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<TestFaucetCoin>(
            caller,
            string::utf8(b"Test Coin"),
            string::utf8(b"TC"),
            DECIMALS,
            true,
        );

        // Save capabilities for coin
        move_to(&signer, TestFaucetCaps {
            extend_ref,
            burn_cap,
            freeze_cap,
            mint_cap,
            burn_ref,
            mint_ref,
            transfer_ref,
        });
    }

    public(friend) entry fun migrate_coin_to_fungible_store(caller: &signer) {
        coin::migrate_to_fungible_store<TestFaucetCoin>(caller);
    }

    public(friend) entry fun mint_coins_to_account(_: &signer, receiver: address, amount: u64) acquires TestFaucetCaps {
        let caps = get_caps();

        let coins = coin::mint<TestFaucetCoin>(amount, &caps.mint_cap);
        aptos_account::deposit_coins(receiver, coins);
    }

    public(friend) entry fun burn_coins_from_account(
        _: &signer,
        receiver: address,
        amount: u64
    ) acquires TestFaucetCaps {
        let caps = get_caps();

        coin::burn_from<TestFaucetCoin>(receiver, amount, &caps.burn_cap);
    }

    public(friend) entry fun freeze_coins_in_account(_: &signer, receiver: address) acquires TestFaucetCaps {
        let caps = get_caps();

        coin::freeze_coin_store(receiver, &caps.freeze_cap);
    }

    public(friend) entry fun unfreeze_coins_in_account(_: &signer, receiver: address) acquires TestFaucetCaps {
        let caps = get_caps();

        coin::freeze_coin_store(receiver, &caps.freeze_cap);
    }

    public(friend) entry fun transfer_coins(caller: &signer, receiver: address, amount: u64) {
        aptos_account::transfer_coins<TestFaucetCoin>(caller, receiver, amount);
    }

    public(friend) entry fun mint_fa_to_account(_: &signer, receiver: address, amount: u64) acquires TestFaucetCaps {
        let caps = get_caps();
        let fa = fungible_asset::mint(&caps.mint_ref, amount);
        primary_fungible_store::deposit(receiver, fa);
    }

    public(friend) entry fun burn_fa_from_account(_: &signer, receiver: address, amount: u64) acquires TestFaucetCaps {
        let caps = get_caps();
        primary_fungible_store::burn(&caps.burn_ref, receiver, amount);
    }

    public(friend) entry fun freeze_fa_in_account(_: &signer, receiver: address) acquires TestFaucetCaps {
        let caps = get_caps();
        primary_fungible_store::set_frozen_flag(&caps.transfer_ref, receiver, true);
    }

    public(friend) entry fun unfreeze_fa_in_account(_: &signer, receiver: address) acquires TestFaucetCaps {
        let caps = get_caps();
        primary_fungible_store::set_frozen_flag(&caps.transfer_ref, receiver, false);
    }

    public(friend) entry fun transfer_fa(caller: &signer, receiver: address, amount: u64) {
        primary_fungible_store::transfer(caller, metadata_object(), receiver, amount);
    }

    #[view]
    public(friend) fun coin_details(): (String, String, u8) {
        (
            coin::name<TestFaucetCoin>(),
            coin::symbol<TestFaucetCoin>(),
            coin::decimals<TestFaucetCoin>(),
        )
    }

    #[view]
    public(friend) fun coin_balance(account: address): u64 {
        coin::balance<TestFaucetCoin>(account)
    }

    #[view]
    public(friend) fun coin_is_migrated(account: address): bool {
        let maybe_metadata = coin::paired_metadata<TestFaucetCoin>();
        if (option::is_some(&maybe_metadata)) {
            let metadata = option::destroy_some(maybe_metadata);
            primary_fungible_store::primary_store_exists(account, metadata)
        } else {
            false
        }
    }

    #[view]
    public(friend) fun fa_details(): Metadata {
        fungible_asset::metadata(metadata_object())
    }

    #[view]
    public(friend) fun fa_balance(account: address): u64 {
        primary_fungible_store::balance(account, metadata_object())
    }

    #[view]
    public(friend) fun fa_metadata_address(): address {
        object_address()
    }

    inline fun get_caps(): &TestFaucetCaps {
        borrow_global<TestFaucetCaps>(object_address())
    }

    inline fun metadata_object(): Object<Metadata> {
        object::address_to_object(object_address())
    }

    inline fun object_address(): address {
        object::create_object_address(&@deployer, TFC)
    }
}
