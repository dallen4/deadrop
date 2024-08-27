# deadrop CLI

## Prerequisites

In order to run the CLI, you need the following: 

- `node`: `>=20`
- `npm`: `>=9` OR `yarn`: `^1`

## Installation

To install the CLI in a project:

```bash
npm install deadrop
```

To install the CLI globally:

```bash
npm install -g deadrop
```

## Usage

To use the CLI and install on-demand:

```bash
npx deadrop [options] [command]
```

### drop

Start a drop session using the drop command and defining the input:

```bash
deadrop drop [options] [input]
```

### grab

Connect to an active drop session using the ID:

```bash
deadrop grab <drop_id>
```
