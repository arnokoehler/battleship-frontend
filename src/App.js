import React, { useState, useEffect } from 'react';
import Grid2 from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import axios from 'axios';

const axiosBackend = axios.create({
    baseURL: 'http://localhost:8080', // Backend URL
});

function App() {
    const [games, setGames] = useState([]);
    const [gameUpdates, setGameUpdates] = useState(null);

    useEffect(() => {
        // Fetch games from the backend
        axiosBackend.get('/games')
            .then(response => setGames(response.data))
            .catch(error => console.error('Error fetching games:', error));
    }, []);

    const createGame = () => {
        axiosBackend.post('/games')
            .then(() => {
                // Refresh the games list after creating a new game
                axiosBackend.get('/games').then(response => setGames(response.data));
            })
            .catch(error => console.error('Error creating game:', error));
    };

    const joinGame = (gameId, player) => {
        // Using EventSource to listen for updates
        const eventSource = new EventSource(`http://localhost:8080/games/${gameId}/players/${player}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setGameUpdates(data); // Update game data in real-time
        };

        eventSource.onerror = (error) => {
            console.error('Error with SSE:', error);
            eventSource.close(); // Close the connection if there's an error
        };

        // Clean up when the component is unmounted
        return () => {
            eventSource.close();
        };
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Battleship Games</h1>

            <Button
                variant="contained"
                color="primary"
                onClick={createGame}
                startIcon={<DirectionsBoatIcon />}
            >
                Create New Game
            </Button>

            <Grid2 container spacing={3} style={{ marginTop: '20px' }}>
                {games.map((game, index) => (
                    <Grid2 item xs={12} sm={6} md={4} key={index}>
                        <div style={{ border: '1px solid black', padding: '10px' }}>
                            <h2>Game #{index + 1}</h2>
                            <p>Status: {game.status}</p>
                            <p>Turn: Player {game.turn}</p>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => joinGame(index + 1, 'A')}
                            >
                                Join as Player A
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => joinGame(index + 1, 'B')}
                            >
                                Join as Player B
                            </Button>
                        </div>
                    </Grid2>
                ))}
            </Grid2>

            {gameUpdates && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Game Updates</h3>
                    <p>Status: {gameUpdates.status}</p>
                    <p>Turn: Player {gameUpdates.turn}</p>
                    {gameUpdates.winner && <p>Winner: Player {gameUpdates.winner}</p>}
                </div>
            )}
        </div>
    );
}

export default App;
