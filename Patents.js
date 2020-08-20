/**
 * See documentation under 'Research Papers' page for more information
 */

 // TODO: Compare with ResearchPapers.js

import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixUsers from 'wix-users';

const DATABASE = "Patents"
const DATASET = "#PatentsDS"
const REPEATER = " #PatentsRepeater"
const CURRENTUSER = wixUsers.currentUser;

/*
FOR REFERENCE, each database item has the following properties:

interface ResearchPaperItem {
  title: String;
  ID: String;
  citation: String;
  filingDate: Timestamp;
  link?: URL;
  publicationNumber: Number;
}
*/


/**** ON PAGE LOAD ****/

$w.onReady(async function () {
	let databaseChanged = false;

	await wixData.query(DATABASE)
		.limit(1000)
		.descending("filingDate") // Sort query by date (newest items first)
		.find()
		.then(async (results) => {
			let items = results.items;
			const totalDatabaseItems = items.length;

			// Allow admins and owners to update publication number automatically (if necessary)
			if (CURRENTUSER.loggedIn && CURRENTUSER.role === 'Admin' || 'Owner') {
				for (var i = 0; i < items.length; i++) {
					let item = items[i];
					let properIndex = totalDatabaseItems - i;
					if (item.publicationNumber !== properIndex) {
						item.publicationNumber = properIndex;
						await wixData.update(DATABASE, item);

						if (databaseChanged === false) {
							databaseChanged = true;
						}
					}
				}
			}
		})

	// Refresh dataset if it was changed above
	if (databaseChanged) {
		refreshDataset(DATASET)
	} else {
    updateElements();
  }

	// Double check that mobile alert message displays only on mobile
	if (wixWindow.formFactor === "Mobile") {
		$w("#mobileAlertMessage").expand();
	} else {
		$w("#mobileAlertMessage").collapse();
	}
	
});

/**
 * Refreshes dataset and updates page elements afterwards.
 * @param {dataset} dataset - dataset to be refreshed
 */
function refreshDataset(dataset) {
	$w(dataset).onReady(() => {
		$w(dataset).refresh()
			.then(() => {
				updateElements();
			});
	})
}


/**** UPDATING DYNAMIC PAGE ELEMENTS ****/

/**
 * Update dynamic page elements, including text results, repeater and container below repeater ("end container")
 */
function updateElements() {
	let total = $w(DATASET).getTotalCount(); // Get total number of papers under current filter

	updateTextResults(total);
	updateEndContainer(total);
	if (total > 0) {
		updateRepeater(); // update repeater if there's items to put in it
	}
	updateNoItemsFound(total)
}

/**
 * Update dynamic text at top of the page to show how many results there are and how many are being displayed
 * @param {number} total - total number of papers under current filter
 */
function updateTextResults(total) {
	let currentlyDisplayed = $w(REPEATER).data.length;

	if (total > 1) {
		$w('#textResults').text = `Showing ${currentlyDisplayed} of ${total} results`;
	} else if (total === 1) {
		$w('#textResults').text = "One result was found";
	} else if (total === 0) {
		$w('#textResults').text = "No results found";
	} else {
		throw new Error("Error occured when updating text results.")
	}
}

/**
 * Check to see if all data from available results is being shown and toggle displaying 'loading buttons' appropriately with an
 * alternative container
 * @param {number} total - total number of papers under current filter
 */
function updateEndContainer(total) {
	let nonZeroPapers = total > 0;
	let allPagesLoaded = $w(DATASET).getCurrentPageIndex() === $w(DATASET).getTotalPageCount();

	if (nonZeroPapers && !allPagesLoaded) {
		showLoadingButtons(true); // Show loading buttons only if there are more pages of papers to load
	} else {
		showLoadingButtons(false);
	}
}

/**
 * Toggles between showing loading buttons and alternative container instead
 * @param {boolean} choice - choice whether to show loading buttons or alternative container
 */
function showLoadingButtons(choice) {
	if (choice === true) {
		$w("#loadingButtonsContainer").show();
		$w("#noLoadingButtons").hide();
	} else if (choice === false) {
		$w("#loadingButtonsContainer").hide();
		$w("#noLoadingButtons").show();
	} else {
		throw new Error("Improper usage of showLoadingButtons()")
	}
}

/**
 * Loop over repeater items to style and notate various components based on item data
 */
function updateRepeater() {
	let previousItemYear;
	let colorFlag = true;

	// Loop over repeater items
	$w(REPEATER).forEachItem(($item, itemData, index) => {
    const YEARBOX_COLOR_LIGHT = "#FFBF3D";
    const YEARBOX_COLOR_DARK = "#DEA633";

    // Checking for missing fields
    try {
      let requiredFields = {
        title: itemData.title,
        citation: itemData.citation,
        filingDate: itemData.filingDate
      }
    } catch (error) {
      throw new Error("At least one required field is missing for item ID: ", itemData._id)
    }

		$item("#publicationNumber").text = itemData.publicationNumber.toString(); // set publication number

        // Display link button and dashed line if link is available
		if (itemData.link) {
			$item("#linkButton").show()
			$item("#numToButtonLine").show()
		} else {
			$item("#linkButton").hide()
			$item("#numToButtonLine").hide()
    }
    
    let currentYear = itemData.filingDate.getFullYear()

    // Toggle between bright/dark year box colors to make adjacent years stand out from each other if they are different
		if (index === 0) {
			colorFlag = true; // Bright color for top-most repeater item
		} else if (previousItemYear !== currentYear) {
			colorFlag = !colorFlag; 
		}

		previousItemYear = currentYear;

		let chosenColor = colorFlag ? YEARBOX_COLOR_LIGHT : YEARBOX_COLOR_DARK;
		$item("#YearBox").style.backgroundColor = chosenColor;

		// Show loading GIF and hide text results until last repeater item is loaded
		if (index + 1 === $w(REPEATER).data.length) { // index + 1 because repeater index starts from 0
			$w("#loadingGIFTop").hide()
			$w("#textResults").show()
		} else {
			$w("#loadingGIFTop").show()
			$w("#textResults").hide()
		}
    
  });
}

/**
 * Display some text to the user if no items exist in the filtered dataset (i.e. if search query leads to 0 results)
 * @param {number} total - total number of papers under current filter
 */
async function updateNoItemsFound(total) {
	if (total > 0) {
		$w("#noItemsFound").hide()
		await $w(REPEATER).expand();
	} else if (total === 0) {
		$w("#noItemsFound").show()
		await $w(REPEATER).collapse();
	} else {
		throw new Error("Improper usage of noItemsCheck(), cannot parse input: ", total)
  }
  
  $w("#loadingGIFTop").hide();
}



/**** 'LOAD' BUTTONS FUNCTIONALITY ****/

/**
 * Manually load another page of data for the dataset and update dynamic page elements
 * @param {click event} event - click event for loadMoreButton
 */
export async function loadMoreButton_click(event) {
	$w("#loadingGIFmore").show();
	await $w(DATASET).loadMore();
	updateElements();
	$w("#loadingGIFmore").hide();
}

/**
 * Load pages of data incrmementally until all have been loaded, then update dynamic page elements
 * @param {click event} event - click event for loadMoreButton
 */
export async function loadAllButton_click(event) {
	$w("#loadingGIFAll").show();

	// Load more data until repeater has all items available
	while ($w(DATASET).getCurrentPageIndex() < $w(DATASET).getTotalPageCount()) {
		await $w(DATASET).loadMore(); // await makes repeater rows load incrementally instead of all at once
	}

	updateElements();
	$w("#loadingGIFAll").hide();
}


/**** SEARCH BOX AND SEARCH RESET EVENT HANDLERS ****/

/**
 * Filter dataset based on user search query and update some dynamic page elements
 * @param {keyPress event} event - keyPress event for search bar
 */
export function searchBar_keyPress(event) {
	filterDataset($w("#searchBar").value);
}

/**
 * Empty out search bar and filter dataset with a blank search query
 * @param {click event} event - click event for the searchResetButton
 */
export function searchResetButton_click(event) {
	$w("#searchBar").value = "";
	filterDataset("");
}

let debounceTimer;

function filterDataset(searchQuery) {

	// Show user that results are processing
	$w("#loadingGIFTop").show();
	$w("#textResults").text = "Processing...";

	// Make sure the user doesn't get ahead of the browser
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}

	debounceTimer = setTimeout(() => {
		// Filter dataset for items with title or content fields that contain the search query, then update page elements
		$w(DATASET).setFilter(wixData.filter().contains("title", searchQuery)
				.or(wixData.filter().contains("content", searchQuery)))
			.then(() => updateElements())
	}, DEBOUNCE_TIME);

  if ($w(DATASET).getTotalCount() > 0) {
    $w(DATASET).loadPage(1); // Load only first page of data for any new search query
  }
}