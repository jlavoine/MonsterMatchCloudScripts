/// NOTE: methods that start with handlers.(methodName) are methods accessible from the client.
/// All other methods are for the SERVER only!!! Do not change these lightly.
/// This file is clearly enormous. I've tried my best to "extract till I drop" and comment everything.
/// Because there are server API limits (10 per call), a lot of methods require the data structures from
/// the API calls to be passed in, so I don't wind up hitting the API a massive number of times.

/////////////////////////////////////////////////
/// Constants
/// Constants used in methods throughout the
/// cloud script.
/////////////////////////////////////////////////

// TESTING GITHUB CONNECTION

/// Title data
const MONSTER_DATA_TITLE_KEY = "MonsterData";
const DUNGEON_DATA_TITLE_KEY = "DungeonData";
const MONSTER_GROUP_DATA_TITLE_KEY = "MonsterGroupData";
const RARITY_DATA_TITLE_KEY = "RarityData";

/// Dungeon Data
const AREA_ID = "AreaId";
const DUNGEON_ID = "DungeonId";
const MAX_MONSTERS = "MaxMonsters";
const GOLD_REWARD = "GoldReward";
const COMMON_MONSTER_GROUP = "CommonMonsterGroup";
const NON_COMMON_MONSTER_GROUP = "NonCommonMonsterGroups";
const RULE_ALLOW_DIAGONALS = "AllowDiagonalMoves";
const RULE_STRAIGHT_LINES = "StraightLinesOnly";
const RULE_ROTATE_PIECE = "ShouldRotatePiecesAfterUse";

// DungeonRewardData
const REWARD_ID = "Id";
const REWARD_COUNT = "Count";
const REWARD_TYPE = "LootType";
const REWARD_TYPE_GOLD = "Gold";

// Currencies
const CURRENCY_GOLD = "G1";

// Internal save data for temporary storage
const CURRENT_DUNGEON_REWARDS = "CurrentDungeonRewards";

// Dungeon Session
const DUNGEON_SESSION_MONSTERS = "Monsters";
const DUNGEON_SESSION_REWARDS = "Rewards";

// Monster Group Data
const GROUP_MONSTERS = "Monsters";
const GROUP_RARITY = "Rarity";

// Rarity Data
const RARITY_CHANCE = "Chance";

// Rarities
const COMMON = "Common";

// Required player save data
const TREASURE_PROGRESS = "TreasureProgress";

/// API specific
const VIRTUAL_CURRENCY = "VirtualCurrency"; // API key for virtual currency
const DATA = "Data";                        // API key for accessing data after getting the save data
const VALUE = "Value";                      // API key for accessing the actual data value after getting the save data

/////////////////////////////////////////////////
/// ~Constants
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Generic Testing
/// These methods should all check that the
/// account is a testing account with isTesting().
/// These methods exist to edit save data and
/// currency in preperation for running very
/// specific integration tests.
/////////////////////////////////////////////////

/// Checks to see if the account is marked for testing.
function isTesting() {
    var internalData = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: ["Testing"] });    
    var data = internalData[DATA];    
    var isTesting = false;

    if (data.hasOwnProperty("Testing")) {
        var value = data["Testing"];
        isTesting = value[VALUE] == "true";
    }
    
    log.info("Account Test Status: " + isTesting);

    return isTesting;
}

/// Test for purposefully going over the cloudscript limit to see what happens
handlers.overLimit = function (args) {
    if (!isTesting()) {
         return { outOfSync : true };;    
    }

    var one = isTesting();
    var two = isTesting();
    var three = isTesting();
    var four = isTesting();
    var five = isTesting();
    var six = isTesting();
    var seven = isTesting();
    var eight = isTesting();
    var nine = isTesting();
    var ten = isTesting();
    var eleven = isTesting();
    var twelve = isTesting();
}

/// for getting at internal data
handlers.getInternalData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();    
    }

    var key = args.data[SAVE_KEY];
    var value = GetInternalSaveData(key);   
    
    return ReturnDataToClient(value);
}

/// for getting read only data
handlers.getReadOnlyData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();    
    }

    var key = args.data[SAVE_KEY];
    var value = GetReadOnlySaveData(key); 
    
    return ReturnDataToClient(value);
}

/// sets player data of a key to a value
handlers.setSaveData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }

    var key = args.data["Key"];
    var value = args.data[VALUE];
    var access = args.data[DATA_ACCESS];

    SetSaveData(key, value, access);
}

/// convenience function that turns some raw data into a json string to send back to client
function ReturnDataToClient(rawData) {
    if (!isTesting()) {
        return returnOutOfSync();    
    }

    return ReturnDataToClientFromServer(rawData);
}

function ReturnDataToClientFromServer(rawData) {
    var dataToString = JSON.stringify(rawData);
    log.info("Returning data to client: " + dataToString);

    var data = { data : dataToString }
    return data;    
}

/// sets a type of the player's currency to a value.
/// this has to be done by adding or subtracting the difference of
/// the incoming value depending on the player's current currency,
/// because there is no API call to set a currency to a specific value.
handlers.setPlayerCurrency = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }    

    var amountToSet = args.data["Amount"];
    var currencyType = args.data["Type"];

    SetCurrency(currencyType, amountToSet);
}

handlers.getPlayerCurrency = function(args) {
        if (!isTesting()) {
        return returnOutOfSync();
    }

    var currencyType = args.data["Type"];
    var playerInventory = GetPlayerInventory();   

    var amount = GetAmountOfCurrency(playerInventory, currencyType);

    return ReturnDataToClient(amount);
}

/// for tests where the players save data needs to be wiped
handlers.deleteAllPlayerReadOnlyData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }    

    WipePlayerData();
}

/// for testing adding missing player data
handlers.addMissingPlayerData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }

    AddMissingPlayerData();    
}

handlers.getAllPlayerReadOnlySaveData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }

    var allSaveData = GetAllReadOnlySaveData();

    return ReturnDataToClient(allSaveData);
}

handlers.getTitleData = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }

    var key = args.data[SAVE_KEY];
    var titleData= GetTitleData(key);

    return ReturnDataToClient(titleData);
}

handlers.getGameMetric = function(args) {
    if (!isTesting()) {
        return returnOutOfSync();
    }

    var metricName = args.data[KEY];

    return ReturnDataToClient(GetGameMetric(metricName));
}

/////////////////////////////////////////////////
/// ~Generic Testing
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Number Restriction
/////////////////////////////////////////////////

function DoesPassNumberRestriction(restriction, value) {
    var min = restriction[MIN];
    var max = restriction[MAX];

    var passes = value >= min && value <= max;

    return passes;
}


/////////////////////////////////////////////////
/// ~Number Restriction
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Metrics
/////////////////////////////////////////////////

function IncrementGameMetric(metricName) {
    var metricsData = GetReadOnlySaveData(GAME_METRICS);
    var allMetrics = metricsData[METRICS];

    if (allMetrics.hasOwnProperty(metricName)) {
        allMetrics[metricName] += 1;
    } else {
        allMetrics[metricName] = 1;
    }

    SetReadOnlyData(GAME_METRICS, metricsData);
}

function GetGameMetric(metricName) {
    var metricsData = GetReadOnlySaveData(GAME_METRICS);
    var allMetrics = metricsData[METRICS];

    if (allMetrics != null && allMetrics.hasOwnProperty(metricName)) {
        return allMetrics[metricName];
    } else {
        return 0;
    }
}

/////////////////////////////////////////////////
/// ~Metrics
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Login
/////////////////////////////////////////////////

handlers.onLogin = function (args) {
    log.info("onLogin()");
    //AddMissingPlayerData(); 
    //SetLoggedInTime();

    return ReturnDataToClientFromServer(Date.now());
}

// use this method to init any read only fields the client may need
handlers.initPlayer = function (args) {
    AddMissingPlayerData();
}

function AddMissingPlayerData() {
    var saveKeysToCheck = [TREASURE_PROGRESS];
    var allSaveData = GetMultipleReadOnlySaveData(saveKeysToCheck);

    if (!allSaveData.hasOwnProperty(TREASURE_PROGRESS)) {
        allSaveData[TREASURE_PROGRESS] = [];        
    }

    StringifySaveData(allSaveData);
    SetSaveDataWithObject(allSaveData, READ_ONLY);
}

/// we use the logged in time to help verify the player's actions
function SetLoggedInTime() {
    var time = Date.now();
    SetSaveData(LOGGED_IN_TIME, time.toString(), INTERNAL);
}

/// This method looks through all the player's data and makes sure that the default values get added
/// if there were no values there.
/*function AddMissingPlayerData() {
    var baseMapSaveKey = MAP_SAVE_KEY + MODULE_BASE;
    var saveKeysToCheck = [baseMapSaveKey, GetProgressKey(CLASS_BUILDING), GetProgressKey(CLASS_GUILD), GetProgressKey(CLASS_UNIT), TRAINER_SAVE_DATA, GAME_METRICS, REPEATABLE_QUEST_PROGRESS];
    var allSaveData = GetMultipleReadOnlySaveData(saveKeysToCheck);

    if (WipePlayerDataIfIntroTutorialIncomplete(allSaveData)) {
        allSaveData = GetMultipleReadOnlySaveData(saveKeysToCheck);
    }

    var arraySaveKeys = [CLASS_BUILDING, CLASS_GUILD, CLASS_UNIT];
    var titleData = GetMultipleTitleData(arraySaveKeys); // iterate through this structure in the method and parse everything

    AddMissingSaveData(allSaveData, arraySaveKeys, titleData);
    StringifySaveData(allSaveData);
    SetSaveDataWithObject(allSaveData, READ_ONLY);
}*/

function WipePlayerDataIfIntroTutorialIncomplete(allSaveData) {
    if (allSaveData.hasOwnProperty(GAME_METRICS)) {
        var introTutorialMetric = GetGameMetric(TUTORIAL_INTRO);
        if (introTutorialMetric == 0) {
            log.info("Intro tutorial incomplete, wiping player data.");
            WipePlayerData();
            return true;
        }
    }

    return false;
}

function AddMissingSaveData(allSaveData, arraySaveKeys, titleData) {
    AddMissingSaveObjects(arraySaveKeys, allSaveData);

    AddRepeatableQuestProgress_IfMissing(allSaveData);
    AddBuildingProgress_IfMissing(allSaveData[GetProgressKey(CLASS_BUILDING)], titleData[CLASS_BUILDING]);
    AddGuildProgress_IfMissing(allSaveData[GetProgressKey(CLASS_GUILD)], titleData[CLASS_GUILD]);
    AddTrainerProgress_IfMissing(allSaveData);
    AddGameMetrics_IfMissing(allSaveData);
    AddUnitProgress_IfMissing(allSaveData[GetProgressKey(CLASS_UNIT)], titleData[CLASS_UNIT]);
    AddWorldProgress_IfMissing(allSaveData);

    // because I don't want to make another call to get data, I am going to put *very first* stuff in here
    AddNewPlayerData_IfMissing(allSaveData);
}

/// This method will add any save data keys as empty objects
function AddMissingSaveObjects(arrayDataKeys, allSaveData) {
    for (var index in arrayDataKeys) {
        var saveKey = GetProgressKey(arrayDataKeys[index]);        
        
        if(!allSaveData.hasOwnProperty(saveKey)) {
            allSaveData[saveKey] = {};
        }
    }    
}

/// In order to be saved, our hash of objects must be a hash of strings
function StringifySaveData(allSaveData) {
    for (var data in allSaveData) {
        var saveObject = allSaveData[data];
        var saveData = JSON.stringify(saveObject);
        allSaveData[data] = saveData;
    }
}

function AddGameMetrics_IfMissing(allSaveData) {
    if (!allSaveData.hasOwnProperty(GAME_METRICS)) {
        allSaveData[GAME_METRICS] = {};        
    }

    var metricsSaveData = allSaveData[GAME_METRICS];
    if (!metricsSaveData.hasOwnProperty(METRICS)) {
        var metrics = {};
        metricsSaveData[METRICS] = metrics;
    }
}

/// This sets the player's first ever map, if they have no map for the base module
// because I don't want to make another call to get data, I am going to put *very first* stuff in here
function AddNewPlayerData_IfMissing(allSaveData) {    
    var baseMapKey = GetMapSaveKey(MODULE_BASE);

    // the || here is because I can't figure out a way to fully wipe a piece of player save data
    if (!allSaveData.hasOwnProperty(baseMapKey) || !allSaveData[baseMapKey].hasOwnProperty(WORLD)) {
        var firstMapData = GetTitleData(NEW_PLAYER_MAP);
        allSaveData[baseMapKey] = firstMapData;

        var isFirstMap = true;
        CreateMissionProgressForMap(firstMapData, isFirstMap);

        ResetCurrency();
    }
}

/////////////////////////////////////////////////
/// ~Login
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// DungeonGameSessionRewards
/////////////////////////////////////////////////

handlers.completeDungeonGameSession = function(args) {
    log.info("completeDungeonGameSession");

    // TODO: Make this cloud method safer!
    var rewards = GetInternalSaveData(CURRENT_DUNGEON_REWARDS);
    AwardRewardsToPlayer(rewards);
    DeleteSavedRewards();
}

function AwardRewardsToPlayer(rewards) {
    for (var index in rewards) {
        var reward = rewards[index];
        AwardRewardToPlayer(reward);
    }
}

function AwardRewardToPlayer(reward) {
    log.info("Awarding reward to player: " + GetRewardId(reward) + " x" + GetRewardCount(reward));

    var rewardType = GetRewardType(reward);
    if (rewardType == REWARD_TYPE_GOLD) {
        var count = GetRewardCount(reward);
        AddCurrency(CURRENCY_GOLD, count);
    }
}

function DeleteSavedRewards() {
    SetInternalData(CURRENT_DUNGEON_REWARDS, {});
}

function GetRewardCount(reward) {
    return reward[REWARD_COUNT];
}

function GetRewardId(reward) {
    return reward[REWARD_ID];    
}

function GetRewardType(reward) {
    return reward[REWARD_TYPE];
}

/////////////////////////////////////////////////
/// !DungeonGameSessionRewards
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// DungeonGameSession
/////////////////////////////////////////////////

handlers.getDungeonGameSession = function(args) {
    log.info("getDungeonGameSession");

    var dungeonSession = CreateDungeonSessionData();

    var gameType = args.data["GameType"];
    var areaId = GetNumberFromArgs(args, AREA_ID);
    var dungeonId = GetNumberFromArgs(args, DUNGEON_ID);
    var dungeonData = GetDungeonData(areaId, dungeonId);

    SetBoardRulesOnSession( dungeonSession, dungeonData, gameType );
    SetMonstersOnSession(dungeonSession[DUNGEON_SESSION_MONSTERS], dungeonData);
    SetRewardsOnSession(dungeonSession[DUNGEON_SESSION_REWARDS], dungeonData);

    SaveSessionRewards(dungeonSession[DUNGEON_SESSION_REWARDS]);

    return ReturnDataToClientFromServer(dungeonSession);
}

function CreateDungeonSessionData() {
    var session = {};
    session[DUNGEON_SESSION_MONSTERS] = [];
    session[DUNGEON_SESSION_REWARDS] = [];

    return session;
}

function SetBoardRulesOnSession( dungeonSession, dungeonData, gameType ) {
    log.info("Setting game rules for game type: " + gameType);

    // for now these are constants; not sure how I want to do this exactly yet
    if (gameType == "puzzle") {
        dungeonSession[RULE_ALLOW_DIAGONALS] = true;
        dungeonSession[RULE_STRAIGHT_LINES] = true;
        dungeonSession[RULE_ROTATE_PIECE] = false; 
    } else {
        dungeonSession[RULE_ALLOW_DIAGONALS] = false;   //GetBoardRuleFromDungeonData( dungeonData, RULE_ALLOW_DIAGONALS );
        dungeonSession[RULE_STRAIGHT_LINES] = false;    //GetBoardRuleFromDungeonData( dungeonData, RULE_STRAIGHT_LINES );
        dungeonSession[RULE_ROTATE_PIECE] = true;       //GetBoardRuleFromDungeonData( dungeonData, RULE_ROTATE_PIECE );
    }
}

function SetMonstersOnSession(sessionMonsterList, dungeonData) {
    log.info("Setting monsters on dungeon session");

    FillMonsterListWithNonCommonMonsters(sessionMonsterList, dungeonData);
    FillRemainingMonstersWithCommonMonsters(sessionMonsterList, dungeonData);
}

// this method is mostly temp until all reward types are implemented
function SetRewardsOnSession(sessionRewardsList, dungeonData) {
    for (var i = 0; i < 3; i++) {
        var defaultGoldReward = GetGoldRewardFromDungeonData(dungeonData);
        var min = -.2;
        var max = .2;
        var randomGoldPercent = Math.random() * (max-min) + min;
        var randomGold = defaultGoldReward * randomGoldPercent;
        var totalGold = Math.ceil(defaultGoldReward + randomGold);

        var reward = {};        
        reward[REWARD_ID] = REWARD_TYPE_GOLD;
        reward[REWARD_TYPE] = REWARD_TYPE_GOLD;
        reward[REWARD_COUNT] = totalGold;

        sessionRewardsList.push(reward);
    }
}

function SaveSessionRewards(sessionRewards) {
    SetInternalData(CURRENT_DUNGEON_REWARDS, sessionRewards);
}

function FillMonsterListWithNonCommonMonsters(sessionMonsterList, dungeonData) {
    log.info("Attempting fill list with uncommon+ monsters");

    var groupData = GetTitleData(MONSTER_GROUP_DATA_TITLE_KEY);
    var rarityData = GetTitleData(RARITY_DATA_TITLE_KEY);

    var nonCommonMonsterGroups = GetNonCommonMonsterGroupsFromDungeonData(dungeonData);
    for (var index in nonCommonMonsterGroups) {
        var groupId = nonCommonMonsterGroups[index];

        TryToAddMonstersFromGroupToList(sessionMonsterList, groupId, groupData, rarityData);
    }
}

function TryToAddMonstersFromGroupToList(monsterList, groupId, groupData, rarityData) {
    log.info("Trying to add monsters from " + groupId);

    var monsters = GetMonstersFromGroup(groupId, groupData);
    var rarityId = GetRarityFromGroup(groupId, groupData);
    var chance = GetChanceFromRarity(rarityId, rarityData);

    for (var index in monsters) {
        var monster = monsters[index];
        log.info("Rolling for " + monster);

        var shouldAddMonster = RollForChance(chance);        
        if (shouldAddMonster) {
            AddMonsterToList(monsterList, monster);
        }
    }
}

function FillRemainingMonstersWithCommonMonsters(sessionMonsterList, dungeonData) {
    log.info("Filling remaining monsters with commons");    

    var currentCount = sessionMonsterList.length;
    var totalTarget = GetMaxMonstersFromDungeonData(dungeonData);
    var remainingToFill = totalTarget - currentCount;
    log.info("Current length is " + currentCount + " vs " + totalTarget);

    var commonMonsters = GetCommonMonstersFromDungeonData(dungeonData);
    ShuffleArray(commonMonsters);

    log.info(commonMonsters.length)
    var i = 0;
    while (remainingToFill > 0 && i < commonMonsters.length) {        
        var monster = commonMonsters[i];
        AddMonsterToList(sessionMonsterList, monster);

        i = i+1;
        remainingToFill -= 1;
    }

    log.info("Done");
}

function AddMonsterToList(monsterList, monster) {
    log.info("Adding " + monster + " to list");
    monsterList.push(monster);
}

/////////////////////////////////////////////////
/// ~DungeonGameSession
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// DungeonData
/////////////////////////////////////////////////

function GetDungeonData(areaId, dungeonId) {
    log.info("Searching dungeon data for " + areaId + "-" + dungeonId);

    var allDungeonData = GetTitleData(DUNGEON_DATA_TITLE_KEY);
    for (var index in allDungeonData) {
        var dungeonData = allDungeonData[index];
        if (dungeonData[AREA_ID] == areaId && dungeonData[DUNGEON_ID] == dungeonId) {
            log.info("Found it!");
            return dungeonData;
        }
    }

    log.info("Could not find it!");
    return null;
}

function GetMaxMonstersFromDungeonData(dungeonData) {
    return dungeonData[MAX_MONSTERS];
}

function GetGoldRewardFromDungeonData(dungeonData) {
    return dungeonData[GOLD_REWARD];
}

function GetBoardRuleFromDungeonData(dungeonData, ruleKey) {
    return dungeonData[ruleKey];
}

function GetCommonMonstersFromDungeonData(dungeonData) {
    log.info("Getting common monsters from " + dungeonData[AREA_ID]);

    var group = GetCommonMonsterGroupFromDungeonData(dungeonData);
    var groupData = GetTitleData(MONSTER_GROUP_DATA_TITLE_KEY);
    var monstersInGroup = GetMonstersFromGroup(group, groupData);

    return monstersInGroup;
}

function GetCommonMonsterGroupFromDungeonData(dungeonData) {
    return dungeonData[COMMON_MONSTER_GROUP];
}

function GetNonCommonMonsterGroupsFromDungeonData(dungeonData) {
    return dungeonData[NON_COMMON_MONSTER_GROUP];
}

/////////////////////////////////////////////////
/// ~DungeonData
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// MonsterGroupData
/////////////////////////////////////////////////

function GetMonstersFromGroup(groupId, groupData) {
    var data = groupData[groupId];
    var monsters = data[GROUP_MONSTERS];

    log.info("Getting monsters from group " + groupId + ": " + JSON.stringify(monsters));
    return monsters;
}

function GetRarityFromGroup(groupId, groupData) {
    var data = groupData[groupId];
    var rarity = data[GROUP_RARITY];

    log.info("Getting rarity from group " + groupId + ": " + rarity);
    return rarity;
}

/////////////////////////////////////////////////
/// ~MonsterGroupData
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// RarityData
/////////////////////////////////////////////////

function GetChanceFromRarity(rarityId, rarityData) {
    var rarity = rarityData[rarityId];
    var chance = rarity[RARITY_CHANCE];

    return chance;
}

function RollForChance(chance) {
    var roll = Math.random();
    var result = roll <= chance;

    log.info("Rolling for chance: " + chance + " with roll " + roll + " with result " + result);
    return result;
}

/////////////////////////////////////////////////
/// ~RarityData
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Client data accessing
/// Methods the client can call to access data
/// that it can't normally access or change.
/////////////////////////////////////////////////

/// This method used to be a lot more complex, getting multiple title datas for each expansion
function GetTitleDataForClass(className) {
    return GetTitleData(className);
}

/////////////////////////////////////////////////
/// ~Client data accessing
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Player data access
/// All calls related to getting or setting
/// generic player data.
/////////////////////////////////////////////////

const READ_ONLY = "ReadOnly";
const INTERNAL = "Internal";

function GetReadOnlySaveData(key) {
    var rawData = server.GetUserReadOnlyData({ PlayFabId: currentPlayerId, Keys: [key] });

    return GetSaveObjectFromRawData(rawData, key); 
}

function GetMultipleReadOnlySaveData(keys) {
    var saveDataObject = server.GetUserReadOnlyData({ PlayFabId: currentPlayerId, Keys: keys });
    var allSaveData = saveDataObject[DATA];

    /// Iterate through all the save data in the save data object gotten from the server.
    /// It re-inserts the object's VALUE (the actual data) into the object. This is necessary because
    /// when we re-save the object, this is the format the API wants it in.
    for (var data in allSaveData) {        
        var saveObject = allSaveData[data];
        var saveData = saveObject[VALUE];
        
        allSaveData[data] = JSON.parse(saveData);
    }

    return allSaveData;    
}

function GetAllReadOnlySaveData() {
    var saveDataObject = server.GetUserReadOnlyData({ PlayFabId: currentPlayerId });
    var allSaveData = saveDataObject[DATA];

    /// Iterate through all the save data in the save data object gotten from the server.
    /// It re-inserts the object's VALUE (the actual data) into the object. This is necessary because
    /// when we re-save the object, this is the format the API wants it in.
    for (var data in allSaveData) {
        var saveObject = allSaveData[data];
        var saveData = saveObject[VALUE];
        allSaveData[data] = JSON.parse(saveData);
    }

    return allSaveData;
}

function GetInternalSaveData(key) {
    var rawData = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: [key] });
    
    return GetSaveObjectFromRawData(rawData, key);   
}

function GetSaveObjectFromRawData(rawData, key) {
    var actualData = rawData[DATA];
    var data = actualData[key];
    var valueData = JSON.parse(data[VALUE]);

    //log.info("Got save data: " + data[VALUE]);

    return valueData; 
}

function SetReadOnlyData(dataKey, dataAsObject) {
    SetSaveData(dataKey, JSON.stringify(dataAsObject), READ_ONLY);    
}

function SetInternalData(dataKey, dataAsObject) {
    SetSaveData(dataKey, JSON.stringify(dataAsObject), INTERNAL); 
}

function SetSaveData(dataKey, dataAsString, dataType) {
    var data = {};
    data[dataKey] = dataAsString;
    log.info("Saving " + dataType + " data for key " + dataKey + ": " + dataAsString);

    SetSaveDataWithObject(data, dataType);
}

// do not use this! use the methods above -- this is "private"
function SetSaveDataWithObject(dataObject, dataType) {
    //log.info("Setting save data of " + dataType + ": " + JSON.stringify(dataObject));

    if (dataType == READ_ONLY) {
        server.UpdateUserReadOnlyData({ PlayFabId: currentPlayerId, Data: dataObject, Permission: "Public"});
    } else if (dataType == INTERNAL) {
        server.UpdateUserInternalData({ PlayFabId: currentPlayerId, Data: dataObject, Permission: "Public"});
    } else {
        log.info("Can't save to data type: " + dataType);
    }
}

/////////////////////////////////////////////////
/// ~Player data access
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Currency
/////////////////////////////////////////////////

function AddCurrency(currencyType, amount) {
    server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, VirtualCurrency: currencyType, Amount: amount });
}

function SubtractCurrency(currencyType, amount) {
    server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, VirtualCurrency: currencyType, Amount: amount });
}

function SetCurrency(currencyType, amountToSet) {
    var playerInventory = GetPlayerInventory();    
    var currentAmount = GetAmountOfCurrency(playerInventory, currencyType);
    var changeInCurrency = currentAmount - amountToSet;    

    log.info("Setting player currency(" + currencyType + ") to " + amountToSet);

    if (changeInCurrency > 0) {
        SubtractCurrency(currencyType, changeInCurrency);        
    } else if (changeInCurrency < 0) {
        AddCurrency(currencyType, Math.abs(changeInCurrency));        
    }
}

function HasEnoughCurrency(playerCurrencies, currencyType, amount) {    
    var currentCurrency = playerCurrencies[currencyType];    
    log.info("Looking for has enough " + amount + " and " + currentCurrency);
    return currentCurrency >= amount;
}

function GetAmountOfCurrency(playerInventory, currencyType) {
    var playerCurrencies = playerInventory[VIRTUAL_CURRENCY];
    return playerCurrencies[currencyType];
}

function GetPlayerCurrenciesFromInventory(playerInventory) {    
    var playerCurrencies = playerInventory[VIRTUAL_CURRENCY];

    return playerCurrencies;
}

function ResetCurrency() {
    SetCurrency( CURRENCY_GOLD, STARTING_GOLD );
}

/////////////////////////////////////////////////
/// ~Currency
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Misc
/// Misc methods that are used by many different
/// server methods.
/////////////////////////////////////////////////

function returnOutOfSync() {
    return { outOfSync : true };
}

function WipePlayerData() {
    var emptyData = {};    
    emptyData[GAME_METRICS] = "{}";

    SetSaveDataWithObject(emptyData, READ_ONLY);

    SetCurrency(CURRENCY_GOLD, 0);
}

function GetRandomArrayElement(array) {
    var randomElement = array[Math.floor(Math.random() * array.length)];
    return randomElement;
}

function ShuffleArray(array) {
    var j, x, i;
    for (var i = array.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = array[i - 1];
        array[i - 1] = array[j];
        array[j] = x;
    }
}

/// returns an array of JSON objects for the given data keys
function GetTitleData(titleDataKey) {
    log.info("Getting title data for " + titleDataKey);

    var titleData = server.GetTitleData({ Keys : titleDataKey });    
    var data = titleData[DATA];
    var actualDataAsString = data[titleDataKey];

    var actualDataAsObject = JSON.parse(actualDataAsString);
    log.info("Title data as string: " + actualDataAsString);

    return actualDataAsObject;
}

function GetMultipleTitleData(arrayKeys) {
    log.info("Getting array of title data for " + JSON.stringify(arrayKeys));

    var arrayData = {};
    var titleData = server.GetTitleData({ Keys : arrayKeys });
    titleData = titleData[DATA];

    // parse all the data into objects so it's easier to use
    for (var dataKey in titleData) {
        var data = titleData[dataKey];
        titleData[dataKey] = JSON.parse(data);
    }
    
    return titleData;
}

function GetPlayerInventory() {
    var inventory = server.GetUserInventory({ PlayFabId: currentPlayerId });

    log.info("Getting player inventory: " + JSON.stringify(inventory));

    return inventory;
}

function GetNumberFromArgs(args, id) {
    var number = parseInt(args.data[id], 10);
    return number;
}

function GetFloatFromArgs(args, id) {
    var float = parseFloat(args.data[id]);
    return float;
}

function GetNumberFromObject(object, key) {
    var num = parseInt(object[key], 10);

    return num;
}

handlers.tutorialComplete = function (args) {
    IncrementGameMetric(TUTORIAL_INTRO);
}

/////////////////////////////////////////////////
/// ~Misc
/////////////////////////////////////////////////

/////////////////////////////////////////////////
/// Cheat Proofing
/////////////////////////////////////////////////

function GetLoggedInTime() {
    var time = GetInternalSaveData(LOGGED_IN_TIME);
    return parseInt(time, 10);
}


/////////////////////////////////////////////////
/// ~Cheat Proofing
/////////////////////////////////////////////////