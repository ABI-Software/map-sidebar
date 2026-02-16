# map-side-bar

[![npm version](https://badge.fury.io/js/%40abi-software%2Fmap-side-bar.svg)](https://badge.fury.io/js/%40abi-software%2Fmap-side-bar)

The project is developed based on Vite-Vue3. Aims to provide a sidebar for searching capability for
SPARC portal.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Package installation

```
npm i @abi-software/map-side-bar
```

## Project Setup

```
npm install
```

### Compile and Hot-Reload for Development

```
npm run serve
```

### Compile and Minify for Production

```
npm run build-bundle
```

## How to use

Import the component and the style from the package.

```javascript
import { SideBar } from "@abi-software/map-side-bar";
import "@abi-software/map-side-bar/dist/style.css";
```

The code in template should looks like this

```html
<SideBar
  :envVars="envVars"
  :visible="sideBarVisibility"
  @actionClick="actionClick"
/>
```

envVars contains environment variables like so:

```yaml
{
  API_LOCATION: 'http://localhost:5000/',
  ALGOLIA_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
  ALGOLIA_ID: 'xxxxx',
  ALGOLIA_INDEX: 'k-core_dev_published_time_desc',
}
```

actionClick event is called when an action button has been clicked on.

## Sidebar Data formats
### Algolia

Data retrieved from Algolia can be found here:
https://github.com/ABI-Software/map-sidebar/blob/3310b165489b10901f50a21e5689ef046251dbd9/src/algolia/algolia.js#L136

```
[
  'pennsieve.publishDate',  // optional
  'pennsieve.updatedAt', // optional
  'Item.curie', //contains the DOI for the dataset (required)
  'Item.name', // dataset title (required)
  'Item.description', // dataset description (required)
  'objectID', // Pennsieve discover ID (required)
],
```

### Scicrunch

Data retrieved from scicrunch can be found here:
https://github.com/nih-sparc/sparc-api/blob/f3444a32964f5340e0ee1f10a08a05839620d098/app/scicrunch_processing_common.py#L25

And mimetypes can be viewed here
https://github.com/nih-sparc/sparc-api/blob/f3444a32964f5340e0ee1f10a08a05839620d098/app/scicrunch_processing_common.py#L28

```
ADDITIONAL_LINKS = 'additionalLinks'
COMMON_IMAGES = 'common-images'
CONTEXT_FILE = 'abi-context-file'
CSV = 'csv'
NAME = 'name'
ORGANS = 'organs'
PLOT_FILE = 'abi-plot'
SEGMENTATION_FILES = 'mbf-segmentation'
SCAFFOLD_DIR = 'abi-scaffold-dir'
SCAFFOLD_FILE = 'abi-scaffold-metadata-file'
THUMBNAIL_IMAGE = 'abi-thumbnail'
SCAFFOLD_VIEW_FILE = 'abi-scaffold-view-file'
SIMULATION_FILE = 'abi-simulation-file'
VIDEO = 'video'
VERSION = 'version'
README = 'readme'
TITLE = 'title'
```

Note: All are optional except for ‘name’

### Sidebar input processing
Sidebar input processing can be viewed here:
https://github.com/ABI-Software/map-sidebar/blob/3310b165489b10901f50a21e5689ef046251dbd9/src/components/SidebarContent.vue#L318

It is used to keep the code from attempting to access an object property that does not exist

### Context card data format
All fields are strings:
```
{
  "description": required ,
  "id": optional,
  "samples": [ // array required here (can be empty)
    {
      "annotation": optional,
      "description": required,
      "doi": optional // Doi will be used to link sample to a separate dataset,
      "heading": required,
      "id": required,
      "path": optional // path will be used to link to file location,
      "view": optional // Will be used to link to “views[i].id”
    }
  ],
  "version": // not currently used,
  "views": [ // array required here (can be empty)
    {
      "annotation": optional,
      "description": required,
      "id": required,
      "path": required // relative path to the view file, eg "derivative\\Scaffolds\\scaffoldMap_tenial_view.json",
      "sample": optional // used to link to views to samples
      "thumbnail": optional // technically optional but it won’t look great
    }
  ]
}
```

An example context card file can be viewed here:
https://drive.google.com/file/d/15NVRBny7WGltpMSRbsgMglXo0xOC3-Q9/view?usp=sharing


## API Documentation

The API documentation is developed with `vitepress` and `vuese`. Documentation pages are in the `docs` folder.

### To run in local development mode
```bash
npm run docs:watch
```

This will start the documentation server with `vitepress` on port `:5173` and watch the components' changes.

