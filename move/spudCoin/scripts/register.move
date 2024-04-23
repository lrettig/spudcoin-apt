script {
    fun register(account: &signer) {
        aptos_framework::managed_coin::register<SpudCoin::spud_coin::SpudCoin>(account)
    }
}
