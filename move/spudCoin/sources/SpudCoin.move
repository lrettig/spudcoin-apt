module SpudCoin::spud_coin {
    struct SpudCoin {}

    fun init_module(sender: &signer) {
        aptos_framework::managed_coin::initialize<SpudCoin>(
            sender,
            b"Spud Coin",
            b"SPUD",
            9,
            false,
        );
    }
}
