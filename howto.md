## Step 1: Deploy the NFT Contract

```bash
npx hardhat deploy-nft --network localhost
````

---

## Step 2: Open the Sale

```bash
npx hardhat open-sale --contract <address> --network localhost
```

---

## Step 3: Mint an NFT

```bash
npx hardhat mint-nft --contract <address> --tokenid <tokenid> --network localhost
```

---

## Step 4: Get NFT Metadata

```bash
npx hardhat get-nft --contract <address> --tokenid <tokenid> --network localhost
```

---

## Step 5: Commit the New Token URI

```bash
npx hardhat commit-uri --contract <address> --afteruri <after_uri> --network localhost
```

---

## Step 6: Verify the Updated Token URI

```bash
npx hardhat get-nft --contract <address> --tokenid <tokenid> --network localhost
```