import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Grid2 from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import ShipIcon from '@mui/icons-material/DirectionsBoat';
import CarrierIcon from '@mui/icons-material/AirportShuttle';
import BattleshipIcon from '@mui/icons-material/DirectionsBoat';
import DestroyerIcon from '@mui/icons-material/Speed';
import SubmarineIcon from '@mui/icons-material/Subway';
import PatrolBoatIcon from '@mui/icons-material/Sailing';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

const axiosBackend = axios.create({
    baseURL: 'http://localhost:8080',
});

const App = () => {
    const [games, setGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [gameUpdates, setGameUpdates] = useState(null);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);
    const [disabledButtons, setDisabledButtons] = useState({});
    const [ships, setShips] = useState([]);
    const [placingShip, setPlacingShip] = useState(null);
    const [placementDirection, setPlacementDirection] = useState('horizontal');

    useEffect(() => {
        const eventSource = new EventSource('http://localhost:8080/games');

        eventSource.onmessage = (event) => {
            const parsedData = JSON.parse(event.data);
            setGames(parsedData);
        };

        eventSource.onerror = (error) => {
            console.error('Error with SSE:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const createGame = async () => {
        try {
            await axiosBackend.post('/games');
        } catch (error) {
            console.error('Error creating game:', error);
        }
    };

    const joinGame = (gameId, player) => {
        axiosBackend.put(`/games/${gameId}/players/${player}`)
            .then(() => {
                const gameEventSource = new EventSource(`http://localhost:8080/games/${gameId}`);

                gameEventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    setGameUpdates(data);
                };

                gameEventSource.onerror = (error) => {
                    console.error('Error with game SSE:', error);
                    gameEventSource.close();
                };

                return () => {
                    gameEventSource.close();
                };
            })
            .catch(error => {
                setError(error.response.data.message);
                setOpen(true);
                setDisabledButtons(prevState => ({
                    ...prevState,
                    [`${gameId}-${player}`]: true
                }));
            });
    };

    const placeShip = async (gameId, player, x, y, direction, type) => {
        try {
            await axiosBackend.post(`/${gameId}/players/${player}/ships`, {
                x,
                y,
                direction,
                type
            });
            // Update the ships state
            setShips([...ships, { x, y, direction, type }]);
        } catch (error) {
            console.error('Error placing ship:', error);
        }
    };

    const handleCellClick = (x, y) => {
        if (placingShip) {
            placeShip(selectedGame.id, 'A', x, y, placementDirection, placingShip.type);
            setPlacingShip(null);
        }
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleBoatClick = (boat) => {
        setPlacingShip(boat);
    };

    const handleDirectionChange = (event, newDirection) => {
        if (newDirection !== null) {
            setPlacementDirection(newDirection);
        }
    };

    const renderCell = (cell, x, y) => {
        let pinClass = 'pin';

        if (cell === 'A') {
            pinClass += ' ship';
        } else if (cell === 'X') {
            pinClass += ' hit';
        } else if (cell === 'O') {
            pinClass += ' miss';
        }

        return (
            <div className="cell" onClick={() => handleCellClick(x, y)}>
                <div className={pinClass}></div>
            </div>
        );
    };

    const boatTypes = [
        { type: 'Carrier', size: 5, icon: <CarrierIcon className="boat-type-icon" /> },
        { type: 'Battleship', size: 4, icon: <BattleshipIcon className="boat-type-icon" /> },
        { type: 'Destroyer', size: 3, icon: <DestroyerIcon className="boat-type-icon" /> },
        { type: 'Submarine', size: 3, icon: <SubmarineIcon className="boat-type-icon" /> },
        { type: 'PatrolBoat', size: 2, icon: <PatrolBoatIcon className="boat-type-icon" /> }
    ];

    return (
        <div>
            <h1>Battleship Game</h1>

            <Button
                variant="contained"
                startIcon={<ShipIcon />}
                onClick={createGame}
            >
                Create New Game
            </Button>

            <div>
                <h2>Available Games</h2>
                <Grid2 container spacing={2}>
                    {games.map((game) => (
                        <Grid2 item xs={12} sm={6} md={4} key={game.id}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6">
                                        Game {game.id}
                                    </Typography>
                                    <Typography color="textSecondary">
                                        Status: {game.status}
                                    </Typography>
                                    <Typography color="textSecondary">
                                        Turn: Player {game.turn}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => joinGame(game.id, 'A')}
                                        disabled={disabledButtons[`${game.id}-A`]}
                                    >
                                        Join as Player A
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => joinGame(game.id, 'B')}
                                        disabled={disabledButtons[`${game.id}-B`]}
                                    >
                                        Join as Player B
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid2>
                    ))}
                </Grid2>
            </div>

            {gameUpdates && (
                <div className="boards-container">
                    <div className="board">
                        <h3>Opponent</h3>
                        {gameUpdates.boards && gameUpdates.boards.A && gameUpdates.boards.A.map((row, rowIndex) => (
                            <Grid2 container item key={rowIndex} spacing={1}>
                                {row.map((cell, colIndex) => (
                                    <Grid2 item key={colIndex} xs={1}>
                                        {renderCell(cell, rowIndex, colIndex)}
                                    </Grid2>
                                ))}
                            </Grid2>
                        ))}
                    </div>
                    <div className="board">
                        <h3>You</h3>
                        {gameUpdates.boards && gameUpdates.boards.B && gameUpdates.boards.B.map((row, rowIndex) => (
                            <Grid2 container item key={rowIndex} spacing={1}>
                                {row.map((cell, colIndex) => (
                                    <Grid2 item key={colIndex} xs={1}>
                                        {renderCell(cell, rowIndex, colIndex)}
                                    </Grid2>
                                ))}
                            </Grid2>
                        ))}
                    </div>
                    <div className="boat-types">
                        <h3>Inventory</h3>
                        <ToggleButtonGroup
                            value={placementDirection}
                            exclusive
                            onChange={handleDirectionChange}
                            aria-label="text alignment"
                        >
                            <ToggleButton value="horizontal" aria-label="left aligned">
                                Horizontal
                            </ToggleButton>
                            <ToggleButton value="vertical" aria-label="centered">
                                Vertical
                            </ToggleButton>
                        </ToggleButtonGroup>
                        {boatTypes.map((boat, index) => (
                            <div key={index} className="boat-type" onClick={() => handleBoatClick(boat)}>
                                {boat.icon}
                                <Typography variant="body1">{boat.type} (Size: {boat.size})</Typography>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle>Error</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {error}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default App;